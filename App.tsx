
import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Radio, 
  Activity, 
  Save, 
  Play, 
  Eye, 
  EyeOff, 
  Loader2, 
  Trash2, 
  Download,
  Mic,
  MicOff,
  Zap,
  Settings,
  Key,
  BrainCircuit,
  Clock
} from 'lucide-react';
import { formatDuration, downloadBlob } from './utils/audioUtils';
import { analyzeIncident } from './services/geminiService';
import IncidentAnalysisCard from './components/IncidentAnalysisCard';
import LiveTacticalMonitor from './components/LiveTacticalMonitor';
import { SavedIncident, AudioChunk } from './types';

// Constants
const BUFFER_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const CHUNK_DURATION_MS = 1000; // 1 second slices
const SAVE_OPTIONS = [1, 5, 10, 15, 20, 25, 30];

function App() {
  // State
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);
  const [stealthMode, setStealthMode] = useState(false);
  const [incidents, setIncidents] = useState<SavedIncident[]>([]);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [bufferSizeSecs, setBufferSizeSecs] = useState(0);
  
  // Live Monitor State
  const [isLiveMonitorOpen, setIsLiveMonitorOpen] = useState(false);

  // Refs for persistence
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<AudioChunk[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize
  useEffect(() => {
    // Load API Key
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setApiKey(storedKey);
    } else {
      setShowKeyModal(true);
    }
    
    // Check (but don't force) permission on load
    checkPermission(false);
    
    return () => stopRecording();
  }, []);

  // Timer to update buffer size visualization
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      // Calculate real buffer size based on timestamps
      const now = Date.now();
      const validChunks = audioChunksRef.current.filter(c => now - c.timestamp < BUFFER_DURATION_MS);
      // Update ref if we pruned
      if (validChunks.length !== audioChunksRef.current.length) {
        audioChunksRef.current = validChunks;
      }
      setBufferSizeSecs(Math.floor(validChunks.length * (CHUNK_DURATION_MS / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
    setShowKeyModal(false);
  };

  const checkPermission = async (forcePrompt = false) => {
    if (!forcePrompt) {
      // Just check status if possible, otherwise assume null until interaction
      const permStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (permStatus.state === 'granted') {
        setPermission(true);
      } else if (permStatus.state === 'denied') {
        setPermission(false);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately, just checking
      setPermission(true);
    } catch (err) {
      console.error("Permission denied", err);
      setPermission(false);
    }
  };

  const startRecording = async () => {
    if (!permission) {
      await checkPermission(true);
      if (!permission) return; // Still failed
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          const now = Date.now();
          // Add to buffer
          audioChunksRef.current.push({
            data: event.data,
            timestamp: now
          });
          
          // Prune buffer (remove chunks older than 30 mins)
          const cutoff = now - BUFFER_DURATION_MS;
          while (audioChunksRef.current.length > 0 && audioChunksRef.current[0].timestamp < cutoff) {
            audioChunksRef.current.shift();
          }
        }
      };

      recorder.start(CHUNK_DURATION_MS); // Slice every second
      setIsRecording(true);
      
      // HACK: Play silent audio to keep the tab active in background on some browsers
      playSilentAudio();

    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Could not start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    stopSilentAudio();
    setIsRecording(false);
  };

  const playSilentAudio = () => {
    // Create a silent audio element to prevent browser throttling
    if (!silentAudioRef.current) {
      const audio = new Audio();
      audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAgZGF0YQAAAAA=';
      audio.loop = true;
      audio.volume = 0.01; // Not perfectly 0 to ensure audio system is engaged
      silentAudioRef.current = audio;
    }
    silentAudioRef.current.play().catch(() => {});
  };

  const stopSilentAudio = () => {
    if (silentAudioRef.current) {
      silentAudioRef.current.pause();
    }
  };

  const saveIncident = (minutes: number): SavedIncident | null => {
    if (audioChunksRef.current.length === 0) return null;

    const now = Date.now();
    const cutoff = now - (minutes * 60 * 1000);
    
    // Filter chunks within the requested window
    const relevantChunks = audioChunksRef.current
      .filter(chunk => chunk.timestamp >= cutoff)
      .map(chunk => chunk.data);

    if (relevantChunks.length === 0) return null;

    const combinedBlob = new Blob(relevantChunks, { type: 'audio/webm' });
    const duration = relevantChunks.length; // Approximate since chunks are 1s

    const newIncident: SavedIncident = {
      id: crypto.randomUUID(),
      timestamp: now,
      durationSeconds: duration,
      blob: combinedBlob,
    };

    setIncidents(prev => [newIncident, ...prev]);
    return newIncident;
  };

  const handleLiveBrainMap = async () => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }
    setIsLiveMonitorOpen(true);
  };

  const handleAnalyze = async (incident: SavedIncident) => {
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }

    setAnalyzingIds(prev => new Set(prev).add(incident.id));
    try {
      const analysis = await analyzeIncident(incident.blob, apiKey);
      setIncidents(prev => prev.map(inc => 
        inc.id === incident.id ? { ...inc, analysis } : inc
      ));
    } catch (err) {
      console.error(err);
      alert("Analysis failed. Check your API Key and internet connection.");
    } finally {
      setAnalyzingIds(prev => {
        const next = new Set(prev);
        next.delete(incident.id);
        return next;
      });
    }
  };

  const handleDelete = (id: string) => {
    setIncidents(prev => prev.filter(inc => inc.id !== id));
  };

  const toggleStealth = () => setStealthMode(!stealthMode);

  // -- RENDER HELPERS --

  if (stealthMode) {
    return (
      <div 
        className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center cursor-pointer select-none"
        onClick={toggleStealth}
      >
        <div className="text-neutral-900 text-xs font-mono">System Idle</div>
        <div className="absolute bottom-4 right-4 w-2 h-2 rounded-full bg-neutral-900 animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-20 font-sans selection:bg-safety-orange selection:text-white">
      
      {/* Live Tactical Monitor Overlay */}
      {isLiveMonitorOpen && (
        <LiveTacticalMonitor 
          apiKey={apiKey} 
          onClose={() => setIsLiveMonitorOpen(false)} 
        />
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Key className="w-6 h-6 text-safety-orange" />
              <h2 className="text-xl font-bold text-white">Gemini API Key Required</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">
              To analyze incidents with the advanced Gemini 3 model, you need to provide your own API key. 
              It will be stored locally in your browser.
            </p>
            <input 
              type="password" 
              placeholder="Enter your API Key (AIza...)"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white mb-4 focus:ring-2 focus:ring-safety-orange focus:border-transparent outline-none"
              autoFocus
              onChange={(e) => setApiKey(e.target.value)}
              value={apiKey}
            />
            <div className="flex justify-end gap-3">
              {/* Allow closing if we have a key already (e.g. editing) */}
              {localStorage.getItem('gemini_api_key') && (
                <button 
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              )}
              <button 
                onClick={() => saveApiKey(apiKey)}
                disabled={!apiKey}
                className="px-6 py-2 bg-safety-orange text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Key
              </button>
            </div>
            <p className="mt-4 text-xs text-slate-500 text-center">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-slate-300">
                Get an API key from Google AI Studio
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Permission Modal (if explicitly missing and user needs to start) */}
      {!permission && !isRecording && permission !== null && (
         <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md text-center shadow-2xl">
             <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
               <Mic className="w-8 h-8 text-safety-orange" />
             </div>
             <h2 className="text-xl font-bold text-white mb-2">Permission Required</h2>
             <p className="text-slate-400 text-sm mb-6">
               EchoSafe needs access to your microphone to maintain the safety buffer, and local storage access to save your API key.
             </p>
             <button 
               onClick={() => checkPermission(true)}
               className="w-full py-3 bg-safety-orange hover:bg-orange-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
             >
               <Mic className="w-4 h-4" />
               Allow Audio & Storage Access
             </button>
           </div>
         </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-safety-orange" />
            <h1 className="text-xl font-bold tracking-tight text-white">EchoSafe</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
               onClick={() => setShowKeyModal(true)}
               className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
               title="API Key Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={toggleStealth}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              Stealth
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        
        {/* Status Card */}
        <div className={`rounded-xl p-6 border transition-all duration-500 ${isRecording ? 'bg-slate-900/50 border-safety-orange/50 shadow-[0_0_30px_-10px_rgba(249,115,22,0.3)]' : 'bg-slate-900 border-slate-700'}`}>
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center border-4 ${isRecording ? 'border-safety-orange bg-safety-orange/10' : 'border-slate-700 bg-slate-800'}`}>
              {isRecording ? (
                <>
                  <Activity className="w-10 h-10 text-safety-orange animate-pulse" />
                  <span className="absolute inset-0 rounded-full border-4 border-safety-orange animate-ping opacity-20"></span>
                </>
              ) : (
                <MicOff className="w-10 h-10 text-slate-500" />
              )}
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {isRecording ? "Buffer Active" : "Monitoring Paused"}
              </h2>
              <p className="text-slate-400 text-sm">
                {isRecording 
                  ? `Maintaining rolling ${formatDuration(bufferSizeSecs)} buffer` 
                  : "Start monitoring to enable retroactive safety saves"}
              </p>
            </div>

            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full max-w-xs py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                isRecording 
                  ? 'bg-slate-800 text-red-400 border border-slate-700 hover:bg-slate-700' 
                  : 'bg-safety-orange text-white hover:bg-orange-600 shadow-lg shadow-orange-900/20'
              }`}
            >
              {isRecording ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>
        </div>

        {/* Live Controls */}
        {isRecording && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Brain Map Button */}
             <button 
              onClick={handleLiveBrainMap}
              className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-4 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 border border-indigo-400/30"
            >
              <div className="absolute inset-0 bg-white/10 group-hover:bg-transparent transition-colors"></div>
              <BrainCircuit className="w-6 h-6 animate-pulse" />
              <div className="text-left">
                <span className="block font-bold text-lg leading-tight">Live Brain Map</span>
                <span className="block text-xs text-indigo-200">What are they doing? What's next? (Live)</span>
              </div>
            </button>

            {/* Save Duration Scroller */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">
                <Clock className="w-3 h-3" />
                Retroactive Save
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {SAVE_OPTIONS.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => saveIncident(mins)}
                    className="flex-shrink-0 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg flex flex-col items-center justify-center gap-1 transition-all active:scale-95 min-w-[70px]"
                  >
                    <span className="font-bold text-lg">{mins}</span>
                    <span className="text-[10px] text-slate-400">MIN</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Incidents List */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-blue-400" />
              Saved Incidents
            </h3>
            <span className="text-xs text-slate-500">{incidents.length} saved</span>
          </div>
          
          {incidents.length === 0 ? (
            <div className="text-center p-8 border border-dashed border-slate-800 rounded-lg text-slate-500">
              No saved incidents yet. Start monitoring to retroactive save audio.
            </div>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <div key={incident.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm text-slate-400 font-mono mb-1">
                        {new Date(incident.timestamp).toLocaleString()}
                      </div>
                      <div className="text-white font-semibold flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${incident.durationSeconds <= 65 ? 'bg-indigo-500' : 'bg-blue-500'}`}></span>
                        {formatDuration(incident.durationSeconds)} Recording
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => downloadBlob(incident.blob, `incident-${incident.timestamp}.webm`)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(incident.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Actions & Analysis */}
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    {!incident.analysis ? (
                      <button
                        onClick={() => handleAnalyze(incident)}
                        disabled={analyzingIds.has(incident.id)}
                        className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm"
                      >
                        {analyzingIds.has(incident.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Live Brainstorming...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Run Tactical Analysis (Gemini 3)
                          </>
                        )}
                      </button>
                    ) : (
                      <IncidentAnalysisCard analysis={incident.analysis} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
