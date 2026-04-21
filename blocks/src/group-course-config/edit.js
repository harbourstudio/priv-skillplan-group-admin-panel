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

    return (
        <div {...useBlockProps()}>
            <h5 className="course-config__title">Group Courses</h5>

            <div className="course-config__add">
                <div className="course-config__search-wrap">
                    <input
                        type="text"
                        className="course-config__search"
                        placeholder="Search courses to add…"
                        readOnly
                    />
                </div>
                <button className="course-config__add-btn btn-unstyled" type="button" disabled>
                    Add
                </button>
            </div>

            <div className="course-config__card">
                <div className="course-config__list">
                    {MOCK_COURSES.map((course) => (
                        <div key={course.id} className="course-config__item">
                            <span className="course-config__name">{course.title}</span>
                            <div className="course-config__toggle-wrap">
                                <span className={`course-config__toggle-label${course.required ? ' is-required' : ''}`}>
                                    {course.required ? 'Required' : 'Optional'}
                                </span>
                                <label className="course-config__toggle">
                                    <input type="checkbox" defaultChecked={course.required} readOnly />
                                    <span className="course-config__slider"></span>
                                </label>
                            </div>
                            <button className="course-config__remove btn-unstyled" type="button" aria-label="Remove course">
                                &#x2715;
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
