import { useEffect } from 'react';
import { useBlockProps } from '@wordpress/block-editor';
import './editor.scss';

const MOCK_COURSES = [
    { id: 1, title: 'Introduction to Safety', required: true },
    { id: 2, title: 'Equipment Handling Basics', required: false },
    { id: 3, title: 'Advanced Compliance Training', required: false },
];

export default function Edit({ clientId, attributes, setAttributes }) {
    const { blockId } = attributes;

    useEffect(() => {
        if (blockId !== clientId) setAttributes({ blockId: clientId });
    }, [clientId]);

    const blockProps = useBlockProps()

    return (
        <div { ...blockProps }>
            <h5>Group Courses</h5>

            <div className="gcc__add">
                <div className="gcc__search-wrap">
                    <input
                        type="text"
                        className="gcc__search"
                        placeholder="Search courses to add…"
                        readOnly
                    />
                </div>
                <button className="gcc__add-btn btn-unstyled" type="button" disabled>
                    Add
                </button>
            </div>

            <div className="gcc__card">
                <div className="gcc__list">
                    {MOCK_COURSES.map((course) => (
                        <div key={course.id} className="gcc__item">
                            <span className="gcc__name">{course.title}</span>
                            <div className="gcc__toggle-wrap">
                                <span className={`gcc__toggle-label${course.required ? ' is-required' : ''}`}>
                                    {course.required ? 'Required' : 'Optional'}
                                </span>
                                <label className="gcc__toggle">
                                    <input type="checkbox" defaultChecked={course.required} readOnly />
                                    <span className="gcc__slider"></span>
                                </label>
                            </div>
                            <button className="gcc__remove btn-unstyled" type="button" aria-label="Remove course">
                                &#x2715;
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
