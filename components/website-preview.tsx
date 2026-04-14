import React from "react";
import { useEffect, useState } from "react";

interface WebsitePreviewProps {
    code: string;
    isLoading?: boolean;
}

export function WebsitePreview({ code, isLoading }: WebsitePreviewProps) {
    const [component, setComponent] = useState<React.ReactNode>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!code) return;

        try {
            // Create a function from the code string
            const componentFunction = new Function(
                "React",
                "useState",
                "useEffect",
                `return ${code}`
            );

            // Execute and render
            const Component = componentFunction(React, useState, useEffect);
            setComponent(<Component />);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error rendering component");
            setComponent(null);
        }
    }, [code]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-gray-50">
                <div className="animate-spin">
                    <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full bg-red-50 p-4">
                <div className="text-red-600 text-center">
                    <p className="font-semibold">Error rendering website</p>
                    <p className="text-sm mt-2">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-white overflow-auto">
            <div className="p-4">{component}</div>
        </div>
    );
}