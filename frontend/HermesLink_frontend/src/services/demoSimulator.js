const STATE_KEY = 'hl_demo_state_v1';

const defaultDevices = [
    {
        device_id: 'home-nas-server',
        name: 'My Home Server (NAS)',
        platform: 'linux',
        status: 'online',
        last_seen: Date.now(),
        storage_profiles: {
            default: {
                name: 'Default Downloads',
                paths: ['/home/prit/Downloads']
            },
            movies: {
                name: 'Media / Movies',
                paths: ['/mnt/media/movies']
            },
            music: {
                name: 'Media / Music',
                paths: ['/mnt/media/music']
            }
        }
    },
    {
        device_id: 'pi-downloader',
        name: 'Raspberry Pi 4',
        platform: 'linux',
        status: 'online',
        last_seen: Date.now(),
        storage_profiles: {
            default: {
                name: 'USB Storage',
                paths: ['/media/usb/downloads']
            }
        }
    }
];

const defaultQueues = [
    {
        queue_id: 'default',
        name: 'Default Queue',
        max_parallel_jobs: 2,
        max_threads_per_job: 4,
        priority: 10,
        enabled: true,
        updated_on: '12-08-2026'
    },
    {
        queue_id: 'media',
        name: 'Media Queue',
        max_parallel_jobs: 1,
        max_threads_per_job: 6,
        priority: 2,
        enabled: true,
        updated_on: '12-08-2026'
    }
];

const defaultJobs = [
    {
        id: 'job-1',
        job_id: 'job-1',
        device_id: 'home-nas-server',
        state: 'RUNNING',
        queue_id: 'default',
        engine_config: {
            url: 'https://releases.ubuntu.com/24.04/ubuntu-24.04-desktop-amd64.iso',
            type: 'aria2',
            storage_profile_id: 'default',
            destination_path_index: 0,
            sub_directory: '',
            auto_extract: false,
            original_file_name: 'ubuntu-24.04-desktop-amd64.iso',
            by_user_file_name: 'ubuntu-24.04-desktop-amd64.iso',
            dynamic_folder: true
        },
        progress: {
            completed_length: 1869169801,
            total_length: 4398046592,
            download_speed: 15400000, // 15.4 MB/s
            filename: 'ubuntu-24.04-desktop-amd64.iso'
        },
        created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: 'job-2',
        job_id: 'job-2',
        device_id: 'home-nas-server',
        state: 'PAUSED',
        queue_id: 'media',
        engine_config: {
            url: 'https://example.com/movies/The.Matrix.1080p.mkv',
            type: 'aria2',
            storage_profile_id: 'movies',
            destination_path_index: 0,
            sub_directory: '',
            auto_extract: false,
            original_file_name: 'The.Matrix.1080p.mkv',
            by_user_file_name: 'The.Matrix.1080p.mkv',
            dynamic_folder: true
        },
        progress: {
            completed_length: 6975026888,
            total_length: 8589934592,
            download_speed: 0,
            filename: 'The.Matrix.1080p.mkv'
        },
        created_at: new Date(Date.now() - 7200 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1800 * 1000).toISOString()
    },
    {
        id: 'job-3',
        job_id: 'job-3',
        device_id: 'pi-downloader',
        state: 'COMPLETED',
        queue_id: 'default',
        engine_config: {
            url: 'https://github.com/twbs/bootstrap/releases/download/v5.3.0/bootstrap-5.3.0-dist.zip',
            type: 'aria2',
            storage_profile_id: 'default',
            destination_path_index: 0,
            sub_directory: '',
            auto_extract: true,
            original_file_name: 'bootstrap-5.3.0-dist.zip',
            by_user_file_name: 'bootstrap-5.3.0-dist.zip',
            dynamic_folder: true
        },
        progress: {
            completed_length: 1572864,
            total_length: 1572864,
            download_speed: 0,
            filename: 'bootstrap-5.3.0-dist.zip'
        },
        created_at: new Date(Date.now() - 14400 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 14000 * 1000).toISOString()
    },
    {
        id: 'job-4',
        job_id: 'job-4',
        device_id: 'home-nas-server',
        state: 'FAILED',
        queue_id: 'default',
        engine_config: {
            url: 'https://dataset.org/large-dataset.tar.gz',
            type: 'direct',
            storage_profile_id: 'default',
            destination_path_index: 0,
            sub_directory: '',
            auto_extract: false,
            original_file_name: 'large-dataset.tar.gz',
            by_user_file_name: 'large-dataset.tar.gz',
            dynamic_folder: true
        },
        progress: {
            completed_length: 1331439206,
            total_length: 10737418240,
            download_speed: 0,
            filename: 'large-dataset.tar.gz'
        },
        error: 'Connection timed out',
        created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 86300 * 1000).toISOString()
    }
];

class DemoSimulator {
    constructor() {
        this.listeners = [];
        this.loadState();
        this.startTimer();
    }

    loadState() {
        try {
            const raw = localStorage.getItem(STATE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this.jobs = parsed.jobs || defaultJobs;
                this.queues = parsed.queues || defaultQueues;
                this.devices = parsed.devices || defaultDevices;
            } else {
                this.jobs = [...defaultJobs];
                this.queues = [...defaultQueues];
                this.devices = [...defaultDevices];
                this.saveState();
            }
        } catch (e) {
            console.error('Failed to load demo state, resetting:', e);
            this.jobs = [...defaultJobs];
            this.queues = [...defaultQueues];
            this.devices = [...defaultDevices];
        }
    }

    saveState() {
        try {
            localStorage.setItem(STATE_KEY, JSON.stringify({
                jobs: this.jobs,
                queues: this.queues,
                devices: this.devices
            }));
        } catch (e) {
            console.error('Failed to save demo state:', e);
        }
    }

    subscribe(listener) {
        this.listeners.push(listener);
        // Fire initial trigger
        listener();
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(l => l());
    }

    startTimer() {
        this.interval = setInterval(() => {
            let updated = false;

            // 1. Sim progress updates on RUNNING jobs
            this.jobs = this.jobs.map(job => {
                if (job.state === 'RUNNING') {
                    updated = true;
                    const prog = job.progress || { completed_length: 0, total_length: 50 * 1024 * 1024, download_speed: 0 };
                    
                    // Vary speed slightly around 12MB - 35MB
                    const currentSpeedMB = 12 + Math.random() * 23;
                    const currentSpeedBytes = Math.floor(currentSpeedMB * 1024 * 1024);

                    const completed = Math.min(
                        prog.completed_length + currentSpeedBytes,
                        prog.total_length
                    );

                    const isCompleted = completed >= prog.total_length;

                    return {
                        ...job,
                        state: isCompleted ? 'COMPLETED' : 'RUNNING',
                        updated_at: new Date().toISOString(),
                        progress: {
                            ...prog,
                            completed_length: completed,
                            download_speed: isCompleted ? 0 : currentSpeedBytes
                        }
                    };
                }
                return job;
            });

            // 2. Sim scheduling queue checks: If active jobs count for a queue is under limit, start next PENDING
            this.queues.forEach(queue => {
                if (!queue.enabled) return;
                
                const maxParallel = queue.max_parallel_jobs;
                
                // Count running jobs in this queue
                const runningCount = this.jobs.filter(j => j.queue_id === queue.queue_id && j.state === 'RUNNING').length;
                
                if (runningCount < maxParallel) {
                    const pendingJobs = this.jobs.filter(j => j.queue_id === queue.queue_id && j.state === 'PENDING');
                    if (pendingJobs.length > 0) {
                        // Sort by created_at ascending
                        pendingJobs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                        const nextJob = pendingJobs[0];
                        
                        this.jobs = this.jobs.map(j => {
                            if (j.id === nextJob.id) {
                                updated = true;
                                return {
                                    ...j,
                                    state: 'RUNNING',
                                    updated_at: new Date().toISOString(),
                                    progress: {
                                        completed_length: 0,
                                        total_length: j.progress?.total_length || 100 * 1024 * 1024,
                                        download_speed: 10 * 1024 * 1024,
                                        filename: j.engine_config?.by_user_file_name || 'download'
                                    }
                                };
                            }
                            return j;
                        });
                    }
                }
            });

            if (updated) {
                this.saveState();
                this.notify();
            }
        }, 1000);
    }

    // --- API & Methods ---
    getJobs() {
        return this.jobs;
    }

    getDevices() {
        return this.devices;
    }

    getQueues() {
        return this.queues;
    }

    addJob(jobData) {
        const id = 'job-' + Date.now();
        
        // Estimate size based on filename/type: e.g. .iso is large, zipped is medium, yt is stream
        let estimatedSize = 85 * 1024 * 1024; // Default 85MB
        const url = jobData.engine_config?.url || '';
        if (url.includes('.iso')) estimatedSize = 4.2 * 1024 * 1024 * 1024;
        else if (url.includes('.zip') || url.includes('.tar')) estimatedSize = 420 * 1024 * 1024;
        else if (url.includes('movie') || url.includes('.mkv') || url.includes('.mp4')) estimatedSize = 1.8 * 1024 * 1024 * 1024;

        const newJob = {
            id,
            job_id: id,
            device_id: jobData.device_id || 'home-nas-server',
            state: 'PENDING',
            queue_id: jobData.queue_id || 'default',
            engine_config: {
                ...jobData.engine_config,
                url: url || 'https://releases.ubuntu.com/24.04/ubuntu-24.04-desktop-amd64.iso'
            },
            progress: {
                completed_length: 0,
                total_length: estimatedSize,
                download_speed: 0,
                filename: jobData.engine_config?.by_user_file_name || 'download'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.jobs = [newJob, ...this.jobs];
        this.saveState();
        this.notify();
        return newJob;
    }

    sendJobAction(jobId, action) {
        this.jobs = this.jobs.map(job => {
            if (job.id === jobId || job.job_id === jobId) {
                let nextState = job.state;
                let completed = job.progress?.completed_length || 0;
                let total = job.progress?.total_length || 100 * 1024 * 1024;
                let speed = job.progress?.download_speed || 0;

                if (action === 'PAUSE' && job.state === 'RUNNING') {
                    nextState = 'PAUSED';
                    speed = 0;
                } else if (action === 'RESUME' && job.state === 'PAUSED') {
                    nextState = 'PENDING'; // Put back into scheduling pipeline
                } else if (action === 'STOP') {
                    nextState = 'STOPPED';
                    speed = 0;
                } else if (action === 'RETRY' || action === 'RESTART') {
                    nextState = 'PENDING';
                    if (action === 'RESTART') completed = 0;
                    speed = 0;
                }

                return {
                    ...job,
                    state: nextState,
                    updated_at: new Date().toISOString(),
                    progress: {
                        ...job.progress,
                        completed_length: completed,
                        total_length: total,
                        download_speed: speed
                    }
                };
            }
            return job;
        });

        this.saveState();
        this.notify();
        return Promise.resolve({ status: 'ok' });
    }

    createQueue(queueId, data) {
        const newQueue = {
            queue_id: queueId,
            name: data.name || queueId,
            max_parallel_jobs: data.max_parallel_jobs ?? 2,
            max_threads_per_job: data.max_threads_per_job ?? 4,
            priority: data.priority ?? 10,
            enabled: data.enabled ?? true,
            updated_on: new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
        };

        this.queues.push(newQueue);
        this.saveState();
        this.notify();
        return Promise.resolve();
    }

    updateQueue(queueId, data) {
        this.queues = this.queues.map(q => {
            if (q.queue_id === queueId) {
                return {
                    ...q,
                    ...data,
                    updated_on: new Date().toLocaleDateString('en-GB').replace(/\//g, '-')
                };
            }
            return q;
        });
        this.saveState();
        this.notify();
        return Promise.resolve();
    }

    deleteQueue(queueId) {
        if (queueId === 'default') {
            return Promise.reject(new Error('Cannot delete default queue'));
        }
        this.queues = this.queues.filter(q => q.queue_id !== queueId);
        // Move jobs in deleted queue back to default queue
        this.jobs = this.jobs.map(j => {
            if (j.queue_id === queueId) {
                return { ...j, queue_id: 'default' };
            }
            return j;
        });
        this.saveState();
        this.notify();
        return Promise.resolve();
    }

    resetAll() {
        localStorage.removeItem(STATE_KEY);
        this.loadState();
        this.notify();
    }
}

export const demoSimulator = new DemoSimulator();
export default demoSimulator;
