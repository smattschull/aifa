import React from "react";

export const metadata = {
    title: "Generated Chat Page",
};

export default function Page() {
    return (
        <div className="min-h-screen p-8">
            <h1 className="text-3xl font-bold mb-4">Generated Chat Page</h1>
            <p className="mb-6">This is a test page created by the dev assistant. It verifies that a page exists and renders on the right panel.</p>

            <section className="rounded-lg border p-6 bg-muted">
                <h2 className="text-xl font-semibold mb-2">Chat Placeholder</h2>
                <div className="text-sm text-muted-foreground">Use the Chat GPT button (left) or the admin flow to generate content and sections for this page.</div>
            </section>
        </div>
    );
}
