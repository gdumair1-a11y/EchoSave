
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { BrainCircuit, X, Mic, Volume2, Activity, Zap } from 'lucide-react';
import { float32ToInt16PCM, uint8ArrayToBase64, base64ToUint8Array, pcmToAudioBuffer } from '../utils/audioUtils';

interface LiveTacticalMonitorProps {
  apiKey: string;
  onClose: () => void;
}

const SYSTEM_INSTRUCTION = `
You are an expert Tactical Safety Officer. Your mission is to provide real-time situational awareness and predictive profiling.
Listen to the audio stream continuously.
You must speak your analysis. Keep it concise, professional, and calm.
Structure your spoken output to cover:
1. Current Status: What is happening right now? (e.g., "Footsteps approaching," "Argument escalating," "Silence detected")
2. Next Move: What is the subject's likely next move? (e.g., "Likely to breach door," "Expect verbal confrontation")
Do not be verbose. Focus on immediate tactical utility.
`;

const LiveTacticalMonitor: React.FC<LiveTacticalMonitorProps> = ({ apiKey, onClose }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [transcription, setTranscription] = useState<string>('');
  
  // Visualizer State
  const [freqData, setFreqData] = useState<Uint8Array>(new Uint8Array(20).fill(0));
  
  // Audio Contexts & Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcription]);

  // Initialize Session
  useEffect(() => {
    let isMounted = true;
    let session: any = null;

    const startSession = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey });
        
        // 1. Setup Audio Input (Mic -> Model)
        // Use 16kHz for input as recommended for speech
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        inputContextRef.current = inputCtx;
        
        // Resume context (browser policy)
        await inputCtx.resume();
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { 
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }});
        
        const source = inputCtx.createMediaStreamSource(stream);
        
        // Setup Visualizer (AnalyserNode)
        const analyser = inputCtx.createAnalyser();
        analyser.fftSize = 64; // Low FFT size for fewer bars
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyserRef.current = analyser;

        // ScriptProcessor for Data Extraction
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        
        // Prevent audio feedback
        const muteNode = inputCtx.createGain();
        muteNode.gain.value = 0;
        processor.connect(muteNode);
        muteNode.connect(inputCtx.destination);
        
        // 2. Setup Audio Output (Model -> Speaker)
        // Gemini Live output is 24kHz
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputContextRef.current = outputCtx;
        await outputCtx.resume();
        
        // 3. Connect to Live API
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: SYSTEM_INSTRUCTION,
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            outputAudioTranscription: {}, 
          },
          callbacks: {
            onopen: () => {
              if (isMounted) setStatus('connected');
              
              // Stream audio from the microphone to the model
              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmInt16 = float32ToInt16PCM(inputData);
                const base64Data = uint8ArrayToBase64(new Uint8Array(pcmInt16.buffer));
                
                // Send to model
                sessionPromise.then(currentSession => {
                   session = currentSession;
                   currentSession.sendRealtimeInput({
                        media: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Data
                        }
                    });
                });
              };
              
              source.connect(processor);
            },
            onmessage: async (msg: LiveServerMessage) => {
                if (!isMounted) return;

                // Handle Interruption
                if (msg.serverContent?.interrupted) {
                    audioSourcesRef.current.forEach(src => {
                        try { src.stop(); } catch(e) {}
                    });
                    audioSourcesRef.current = [];
                    nextStartTimeRef.current = 0;
                    setTranscription(prev => prev + "\n[INTERRUPTED]\n> ");
                    return;
                }

                // Handle Audio Output
                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData && outputContextRef.current) {
                    const ctx = outputContextRef.current;
                    const pcmData = base64ToUint8Array(audioData);
                    const audioBuffer = pcmToAudioBuffer(pcmData, ctx, 24000);
                    
                    const src = ctx.createBufferSource();
                    src.buffer = audioBuffer;
                    src.connect(ctx.destination);
                    
                    src.onended = () => {
                        audioSourcesRef.current = audioSourcesRef.current.filter(s => s !== src);
                    };
                    
                    audioSourcesRef.current.push(src);
                    
                    // Schedule playback
                    const currentTime = ctx.currentTime;
                    // Reset start time if we fell behind significantly
                    if (nextStartTimeRef.current < currentTime) {
                        nextStartTimeRef.current = currentTime;
                    }
                    
                    src.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                }

                // Handle Transcription
                const text = msg.serverContent?.outputTranscription?.text;
                if (text) {
                    setTranscription(prev => {
                       const newText = prev + text;
                       return newText.length > 2000 ? "..." + newText.slice(-2000) : newText;
                    });
                }
                
                if (msg.serverContent?.turnComplete) {
                   setTranscription(prev => prev + "\n\n> "); 
                }
            },
            onclose: () => {
              if (isMounted) setStatus('disconnected');
            },
            onerror: (err) => {
              console.error("Live API Error:", err);
              if (isMounted) setStatus('error');
            }
          }
        });

      } catch (err) {
        console.error("Failed to start session:", err);
        if (isMounted) setStatus('error');
      }
    };

    startSession();

    return () => {
      isMounted = false;
      if (session) {
        session.close();
      }
      inputContextRef.current?.close();
      outputContextRef.current?.close();
    };
  }, [apiKey]);

  // Visualization Loop
  useEffect(() => {
    const updateVisualizer = () => {
      if (analyserRef.current && status === 'connected') {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        setFreqData(dataArray.slice(0, 20));
      }
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    };

    if (status === 'connected') {
        updateVisualizer();
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [status]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-lg relative bg-slate-900 border border-indigo-500/50 rounded-2xl p-6 shadow-2xl shadow-indigo-900/40">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-indigo-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <h2 className="text-xl font-bold text-white tracking-widest flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-indigo-400" />
                LIVE TACTICAL LINK
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Visualizer Area */}
        <div className="h-32 mb-6 bg-black/50 rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden">
             {/* Background Grid */}
             <div className="absolute inset-0 bg-[linear-gradient(rgba(79,70,229,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.1)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
             
             {status === 'connecting' && <span className="text-indigo-400 font-mono animate-pulse">ESTABLISHING UPLINK...</span>}
             {status === 'error' && <div className="text-center">
                 <span className="text-red-500 font-mono font-bold block">CONNECTION FAILED</span>
                 <span className="text-xs text-slate-500">Check API Key & Permissions</span>
             </div>}
             
             {status === 'connected' && (
                <div className="flex items-end gap-1 h-16 px-4 w-full justify-between">
                    {/* Visualizer Bars */}
                    {Array.from(freqData).map((value: number, i) => (
                        <div 
                            key={i} 
                            className="flex-1 bg-indigo-500 transition-[height] duration-75 rounded-t-sm mx-[1px]"
                            style={{ 
                                height: `${Math.max(4, (value / 255) * 100)}%`,
                                opacity: Math.max(0.3, value / 255) 
                            }}
                        ></div>
                    ))}
                </div>
             )}
        </div>

        {/* Brain Map Transcription */}
        <div className="space-y-2">
            <h3 className="text-xs uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Live Brain Map Stream
            </h3>
            <div className="bg-slate-950 rounded-lg p-4 h-48 overflow-y-auto border border-indigo-500/20 font-mono text-sm shadow-inner scrollbar-thin scrollbar-thumb-indigo-900 scrollbar-track-transparent">
                <p className="whitespace-pre-wrap text-indigo-100 leading-relaxed">
                   {transcription || <span className="text-slate-500 italic opacity-50">Waiting for tactical analysis stream...</span>}
                </p>
                <div ref={scrollRef}></div>
            </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-2">
                <Mic className={`w-4 h-4 ${status === 'connected' ? 'text-red-400 animate-pulse' : 'text-slate-600'}`} />
                <span>MIC LIVE</span>
            </div>
            <div className="flex items-center gap-2">
                <Volume2 className={`w-4 h-4 ${status === 'connected' ? 'text-indigo-400' : 'text-slate-600'}`} />
                <span>AUDIO FEED ACTIVE</span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default LiveTacticalMonitor;
