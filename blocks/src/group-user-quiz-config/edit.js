import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <div className="uqc-card">
                <h5 className="uqc-card__title">Per-user quiz override</h5>
                {/* <p className="uqc-card__subtitle">Reset or resend attempts for a specific learner</p> */}

                <div className="uqc-fields">
                    <div className="uqc-field">
                        <label className="uqc-label">Find learner</label>
                        <input type="text" className="uqc-input" placeholder="Search by name or email…" readOnly />
                    </div>
                    <div className="uqc-field">
                        <label className="uqc-label">Select quiz</label>
                        <div className="uqc-select-wrap">
                            <select className="uqc-select" disabled>
                                <option value="">Choose quiz</option>
                            </select>
                            <i className="fa-solid fa-chevron-down uqc-select-chevron" aria-hidden="true"></i>
                        </div>
                    </div>
                </div>

                <div className="uqc-date-row">
                    <div className="uqc-date-field">
                        <i className="fa-solid fa-play uqc-date-icon" aria-hidden="true"></i>
                        <input type="datetime-local" className="uqc-datetime" defaultValue="2025-09-01T23:00" readOnly />
                    </div>
                    <div className="uqc-date-field">
                        <i className="fa-solid fa-flag uqc-date-icon" aria-hidden="true"></i>
                        <input type="datetime-local" className="uqc-datetime" defaultValue="2025-12-31T12:00" readOnly />
                    </div>
                </div>

                <div className="uqc-actions">
                    <span className="uqc-btn-primary">Save Changes</span>
                    <span className="uqc-btn-outline">Notify Learner</span>
                </div>
            </div>
        </div>
    );
}
