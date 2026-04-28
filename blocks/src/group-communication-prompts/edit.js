import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const PROMPTS = [
    { title: 'Password reset',              desc: 'Lorem ipsum dolor sit amet consectetur. Maecenas etiam at dignissim urna risus quis.' },
    { title: 'Course progress nudge',       desc: "Sent to inactive learners who haven't logged in within 14 days. Links to last active course." },
    { title: 'Assessment deadline warning', desc: "7-day warning for learners who haven't completed a required assessment before the access close date." },
    { title: 'Welcome/login reminder',      desc: 'Lorem ipsum dolor sit amet consectetur. Maecenas etiam at dignissim urna risus quis.' },
    { title: 'Custom message',              desc: 'Lorem ipsum dolor sit amet consectetur. Maecenas etiam at dignissim urna risus quis.' },
];

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <h5>Learner prompts</h5>
            <p className="gcp__subtitle">Pre-configured nudges defined by SkillPlan. Select a template, choose recipients, and send.</p>

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
