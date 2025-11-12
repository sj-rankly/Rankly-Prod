"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

export function MarkdownViewerWithBlocks({ content }: { content: string }) {
  const components: Components = {
    h1: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-4">
        <span className="block-type-label">h1</span>
        <h1 className="flex-1 text-3xl font-semibold text-foreground" {...props} />
      </div>
    ),
    h2: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-4">
        <span className="block-type-label">h2</span>
        <h2 className="flex-1 text-2xl font-semibold text-foreground" {...props} />
      </div>
    ),
    h3: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-4">
        <span className="block-type-label">h3</span>
        <h3 className="flex-1 text-xl font-semibold text-foreground" {...props} />
      </div>
    ),
    h4: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-4">
        <span className="block-type-label">h4</span>
        <h4 className="flex-1 text-lg font-semibold text-foreground" {...props} />
      </div>
    ),
    h5: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-4">
        <span className="block-type-label">h5</span>
        <h5 className="flex-1 text-base font-semibold text-foreground" {...props} />
      </div>
    ),
    h6: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-4">
        <span className="block-type-label">h6</span>
        <h6 className="flex-1 text-sm font-semibold text-foreground" {...props} />
      </div>
    ),
    p: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-3">
        <span className="block-type-label">p</span>
        <p className="flex-1 text-base leading-relaxed text-foreground" {...props} />
      </div>
    ),
    ul: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-3">
        <span className="block-type-label">ul</span>
        <ul className="flex-1 text-foreground markdown-list" {...props} />
      </div>
    ),
    ol: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-3">
        <span className="block-type-label">ol</span>
        <ol className="flex-1 text-foreground markdown-list" {...props} />
      </div>
    ),
    li: ({ node, ...props }) => (
      <li className="text-foreground leading-relaxed" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
      <div className="flex items-start gap-3 my-3">
        <span className="block-type-label">"</span>
        <blockquote className="flex-1 border-l-2 border-border pl-4 italic text-muted-foreground" {...props} />
      </div>
    ),
    code: ({ node, inline, ...props }: any) => {
      if (inline) {
        return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props} />;
      }
      return (
        <div className="flex items-start gap-3 my-3">
          <span className="block-type-label">code</span>
          <pre className="flex-1 bg-muted p-4 rounded-lg overflow-x-auto">
            <code className="text-sm font-mono" {...props} />
          </pre>
        </div>
      );
    },
    hr: ({ node, ...props }) => (
      <div className="flex items-center gap-3 my-4">
        <span className="block-type-label">hr</span>
        <hr className="flex-1 border-border" {...props} />
      </div>
    ),
  };

  return (
    <article className="max-w-none w-full py-6 px-8">
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </article>
  );
}

