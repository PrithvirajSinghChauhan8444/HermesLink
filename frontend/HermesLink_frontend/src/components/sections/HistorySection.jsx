import { useState, useEffect, useRef } from 'react';
import { endpoints } from '../../services/api';
import { formatBytes } from '../../utils/format';

export default function HistorySection() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await endpoints.jobs.history();
                setJobs(response.data.jobs);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-8 text-white relative">

            <div className="w-full max-w-6xl z-10">
                <div className="flex justify-between items-end mb-8">
                    <h2 className="text-5xl font-light tracking-tighter">Event Log</h2>
                    <div className="flex gap-2 text-xs">
                        <span className="px-3 py-1 bg-white/10 rounded-full border border-white/5 hover:bg-white/20 cursor-pointer transition-colors">All</span>
                        <span className="px-3 py-1 bg-transparent rounded-full border border-white/5 hover:bg-white/10 cursor-pointer transition-colors text-green-500">Completed</span>
                        <span className="px-3 py-1 bg-transparent rounded-full border border-white/5 hover:bg-white/10 cursor-pointer transition-colors text-red-500">Failed</span>
                    </div>
                </div>

                <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#111111]/90 depth-shadow">
                    <div className="grid grid-cols-12 bg-white/5 p-4 text-xs font-mono text-gray-400 uppercase tracking-wider border-b border-white/5">
                        <div className="col-span-1">Date</div>
                        <div className="col-span-5">Filename / ID</div>
                        <div className="col-span-2 text-right">Size</div>
                        <div className="col-span-2 text-center">Status</div>
                        <div className="col-span-2 text-right">Engine</div>
                    </div>

                    <div className="h-[55vh] overflow-y-auto no-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500 font-light">Loading records...</div>
                        ) : jobs.length === 0 ? (
                            <div className="p-12 text-center text-gray-600 font-light">No history data available.</div>
                        ) : (
                            jobs.map((job) => (
                                <div key={job.job_id} className="grid grid-cols-12 p-4 text-sm items-center border-b border-white/5 hover:bg-white/5 transition-colors group">
                                    <div className="col-span-1 text-xs text-gray-500 font-mono">
                                        {new Date(job.updated_at).toLocaleDateString()}
                                    </div>
                                    <div className="col-span-5 truncate text-gray-300 group-hover:text-white transition-colors" title={job.progress.filename}>
                                        {job.progress.filename || job.job_id}
                                    </div>
                                    <div className="col-span-2 text-right font-mono text-gray-400">
                                        {formatBytes(job.progress.total_length)}
                                    </div>
                                    <div className="col-span-2 flex justify-center">
                                        <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border ${job.state === 'COMPLETED' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                            job.state === 'FAILED' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-gray-500/10 border-gray-500/20 text-gray-500'
                                            }`}>
                                            {job.state}
                                        </span>
                                    </div>
                                    <div className="col-span-2 text-right text-xs text-gray-500 group-hover:text-gray-300">
                                        {job.engine_config.type}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
