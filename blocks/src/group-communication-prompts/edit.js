import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const PROMPTS = [
    { title: 'Password reset',              desc: 'Send a secure password reset link to learners who are unable to access their account.' },
    { title: 'Course progress reminder',       desc: "Remind inactive learners to return to their courses and continue their progress." },
    { title: 'Assessment reminder', desc: "Send a reminder to learners about an upcoming assessment." },
    { title: 'Welcome and login information',      desc: 'Send new group members a welcome message with instructions for accessing their account.' },
    { title: 'Custom message',              desc: 'Create and send a personalized message to selected learners.' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <h5>Learner prompts</h5>
            <p className="gcp__subtitle">Ready-to-send messages to engage learners. Choose a template, select recipients and send.</p>

            <div className="gcp__card">
                {PROMPTS.map((prompt) => (
                    <div key={prompt.title} className="gcp__item">
                        <div className="gcp__icon" aria-hidden="true">
                            <i className="fa-regular fa-envelope"></i>
                        </div>
                        <div className="gcp__info">
                            <span className="gcp__name">{prompt.title}</span>
                            <span className="gcp__desc">{prompt.desc}</span>
                        </div>
                        <div className="gcp__actions">
                            <span className="gcp__history">Prompt History</span>
                            <span className="gcp__proceed">Proceed</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
