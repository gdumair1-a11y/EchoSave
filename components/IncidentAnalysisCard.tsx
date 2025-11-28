
import React from 'react';
import { IncidentAnalysis } from '../types';
import { ShieldAlert, CheckCircle, AlertTriangle, Info, BrainCircuit, Footprints } from 'lucide-react';

interface IncidentAnalysisCardProps {
  analysis: IncidentAnalysis;
}

const IncidentAnalysisCard: React.FC<IncidentAnalysisCardProps> = ({ analysis }) => {
  const getThreatColor = (level: string) => {
    switch (level) {
      case 'Critical': return 'text-red-600 bg-red-100 border-red-600';
      case 'High': return 'text-orange-600 bg-orange-100 border-orange-600';
      case 'Medium': return 'text-yellow-600 bg-yellow-100 border-yellow-600';
      default: return 'text-green-600 bg-green-100 border-green-600';
    }
  };

  const ThreatIcon = analysis.threatLevel === 'Low' ? CheckCircle : (analysis.threatLevel === 'Critical' ? ShieldAlert : AlertTriangle);

  return (
    <div className="mt-4 bg-slate-800 rounded-lg p-4 border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          AI Analysis Report
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getThreatColor(analysis.threatLevel)} flex items-center gap-2`}>
          <ThreatIcon className="w-4 h-4" />
          {analysis.threatLevel} Threat
        </span>
      </div>

      <div className="space-y-6">
        {/* Brain Map Section (Grouped for Impact) */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-lg border border-indigo-500/30 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">
                <BrainCircuit className="w-16 h-16 text-indigo-400" />
            </div>
            
            <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2 relative z-10">
                <BrainCircuit className="w-5 h-5" />
                Tactical Brain Map
            </h3>
            
            {/* Current Situation */}
            <div className="mb-4 relative z-10">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Current Action Profile</h4>
                <p className="text-white text-sm leading-relaxed font-medium border-l-2 border-indigo-500 pl-3">
                    "{analysis.currentSituation}"
                </p>
            </div>
            
            {/* Predicted Moves */}
            <div className="relative z-10">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2 flex items-center gap-2">
                    <Footprints className="w-3 h-3" />
                    Predicted Next Moves
                </h4>
                <div className="grid gap-2">
                    {analysis.predictedNextMoves.map((move, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-200 bg-black/20 p-2 rounded border border-indigo-500/10">
                        <span className="text-indigo-400 font-mono text-xs mt-0.5">{`0${i+1}`}</span>
                        {move}
                    </div>
                    ))}
                </div>
            </div>
        </div>

        {/* Summary & Sentiment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Summary</h4>
            <p className="text-slate-300 text-sm leading-relaxed">{analysis.summary}</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Sentiment</h4>
            <p className="text-slate-300 text-sm">{analysis.sentiment}</p>
          </div>
        </div>

        {/* Key Events */}
        <div>
          <h4 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Key Events Detected</h4>
          <ul className="list-disc list-inside text-slate-300 text-sm space-y-1 marker:text-slate-600">
            {analysis.keyEvents.map((event, i) => (
              <li key={i}>{event}</li>
            ))}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="pt-2 border-t border-slate-700">
           <h4 className="text-xs uppercase tracking-wider text-green-400 font-bold mb-2">Safety Recommendations</h4>
           <ul className="space-y-2">
            {analysis.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <div className="min-w-1.5 min-h-1.5 w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default IncidentAnalysisCard;
