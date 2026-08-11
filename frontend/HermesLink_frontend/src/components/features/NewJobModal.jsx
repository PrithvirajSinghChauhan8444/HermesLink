import NewJobForm from './NewJobForm';
import './NewJobModal.css';

export default function NewJobModal({ isOpen, onClose, onJobCreated }) {
    if (!isOpen) return null;

    return (
        <div className="new-job-modal-overlay" onWheel={(e) => e.stopPropagation()}>
            <div className="new-job-modal-container">
                <div className="modal-glow-blob-1" />
                <div className="modal-glow-blob-2" />
                <div className="modal-header">
                    <h2 className="modal-title">New Download</h2>
                    <button onClick={onClose} className="close-button">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <NewJobForm 
                    isOpen={isOpen}
                    onClose={onClose} 
                    onJobCreated={onJobCreated} 
                />
            </div>
        </div>
    );
}
