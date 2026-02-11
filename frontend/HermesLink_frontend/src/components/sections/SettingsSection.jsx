export default function SettingsSection() {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-8 text-white relative">
            <h2 className="text-5xl font-light mb-12 tracking-tighter z-10">Configuration</h2>

            <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 z-10">
                {['General', 'Network', 'Engines', 'Storage'].map((item, index) => (
                    <div key={item} className={index === 1 ? "bg-[#111111]/90 p-8 rounded-2xl border border-white/10 depth-shadow" : "border border-white/10 p-6 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"}>
                        <h3 className={index === 1 ? "text-xl font-light mb-6 border-b border-white/10 pb-2" : "text-xl font-light mb-2 group-hover:text-white text-gray-300"}>{item}</h3>
                        <p className="text-sm text-gray-600 group-hover:text-gray-500">Manage {item.toLowerCase()} settings</p>
                    </div>
                ))}
            </div>

            <div className="mt-16 text-xs font-mono text-gray-700 z-10">
                HERMESLINK SYSTEM v1.0.0 • BUILD 2026.02
            </div>
        </div>
    );
}
