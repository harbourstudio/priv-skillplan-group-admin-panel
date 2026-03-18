import React, { useEffect, useState } from "react"
import metadata from './block.json';

import { useBlockProps, InnerBlocks } from '@wordpress/block-editor';

export default function save({ attributes, setAttributes }) {
	const blockProps = useBlockProps.save();

    return (
        <>
        <div {...blockProps}></div>
        <InnerBlocks.Content />
        </>
    )
}