import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const MOCK_COURSES = [
    {
        name: 'Workplace Safety 101',
        quizzes: [
            { name: 'Module 1 Quiz',    opens: '2025-06-01T09:00', closes: '2025-06-30T17:00', completed: 12, pending: 4 },
        ],
    },
    {
        name: 'Equipment Handling Basics',
        quizzes: [
            { name: 'Safety Check Quiz', opens: '', closes: '2025-07-15T17:00', completed: 15, pending: 1 },
        ],
    },
];

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    return (
        <div {...useBlockProps()}>
            <h5>Quiz Configuration</h5>

            <div className="quiz-config__card">
                {MOCK_COURSES.map((course) => (
                    <div key={course.name} className="quiz-config__course-section">
                        {/* <div className="quiz-config__course-header">
                            <span className="quiz-config__course-name">{course.name}</span>
                        </div> */}

                        {course.quizzes.map((quiz) => (
                            <div key={quiz.name} className="quiz-config__item">
                                <span className="quiz-config__quiz-name">{quiz.name}</span>

                                <div className="quiz-config-date-row">
                                    <div className="quiz-config-date-field" title="Opens — quiz becomes available from this date">
                                        <i className="fa-solid fa-play quiz-config-date-icon" aria-hidden="true"></i>
                                        <input type="datetime-local" className="quiz-config-datetime" defaultValue="2025-09-01T23:00" readOnly />
                                    </div>
                                    <div className="quiz-config-date-field" title="Closes — quiz is no longer accessible after this date">
                                        <i className="fa-solid fa-flag quiz-config-date-icon" aria-hidden="true"></i>
                                        <input type="datetime-local" className="quiz-config-datetime" defaultValue="2025-12-31T12:00" readOnly />
                                    </div>
                                    <div className="quiz-config-date-field quiz-config-date-field--attempts" title="Attempts — max times a learner can take this quiz">
                                        <i className="fa-solid fa-hashtag quiz-config-date-icon" aria-hidden="true"></i>
                                        <input type="number" className="quiz-config-attempts" placeholder="Unlimited" readOnly />
                                    </div>
                                </div>

                                <div className="quiz-config__badges">
                                    <span className="quiz-config__badge quiz-config__badge--completed">
                                        <span className="quiz-config__badge-count">{quiz.completed}</span> Completed
                                    </span>
                                    <span className="quiz-config__badge quiz-config__badge--pending">
                                        <span className="quiz-config__badge-count">{quiz.pending}</span> Not Completed
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
