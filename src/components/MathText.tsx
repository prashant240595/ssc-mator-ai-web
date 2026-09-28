import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Renders question text with:
 *  - Math: $...$ inline, $$...$$ block, also \( \) / \[ \]
 *  - Markdown tables (GFM pipe tables)
 *  - Mermaid diagrams inside ```mermaid ... ``` fences (charts/graphs)
 */

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
function loadMermaid() {
  if (typeof window === "undefined") return Promise.resolve(null as never);
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      const mer = m.default;
      mer.initialize({ startOnLoad: false, securityLevel: "loose", theme: "default" });
      return mer;
    });
  }
  return mermaidPromise;
}

const MermaidInner = memo(
  function MermaidInner({ code }: { code: string }) {
    const uid = useId().replace(/[:]/g, "");
    const id = `m${uid}`;
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState<string>("");
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;
      loadMermaid()
        .then(async (mer) => {
          if (!mer || cancelled) return;
          try {
            const out = await mer.render(id, code);
            if (!cancelled) setSvg(out.svg);
          } catch (e: any) {
            if (!cancelled) setErr(String(e?.message || e));
          }
        })
        .catch((e) => !cancelled && setErr(String(e)));
      return () => {
        cancelled = true;
      };
    }, [code, id]);

    if (err) {
      return <div className="my-2 text-sm text-destructive">Unable to render chart.</div>;
    }
    // Reserve min-height to avoid scroll jump while async render completes.
    return (
      <div
        ref={ref}
        className="my-2 flex min-h-[120px] max-w-full justify-center overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  },
  (a, b) => a.code === b.code,
);

function normalize(src: string): string {
  const cleanText = src ? src.replace(/\\n/g, "\n") : "";
  return cleanText
    .replace(/\\r(?![a-zA-Z])/g, "\r")
    .replace(/\\t(?![a-zA-Z])/g, "\t")
    .replace(/\r\n?/g, "\n")
    .replace(/\\\((.+?)\\\)/gs, (_, m) => `$${m}$`)
    .replace(/\\\[(.+?)\\\]/gs, (_, m) => `$$${m}$$`);
}

const mdComponents = {
  p: ({ children }: any) => <span className="block whitespace-pre-wrap">{children}</span>,
  table: ({ children }: any) => (
    <div className="my-2 block w-full max-w-full overflow-x-auto">
      <table className="w-max min-w-full border-collapse border border-border text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: any) => <thead className="bg-muted">{children}</thead>,
  th: ({ children }: any) => (
    <th className="border border-border px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }: any) => <td className="border border-border px-2 py-1 align-top">{children}</td>,
  pre: ({ children }: any) => <>{children}</>,
  code: ({ className, children, ...props }: any) => {
    const lang = /language-([^\s]+)/.exec(className || "")?.[1]?.toLowerCase();
    const text = String(children ?? "").replace(/\n$/, "");
    if (lang === "mermaid") return <MermaidInner code={text} />;
    if (lang) {
      return (
        <pre className="my-2 overflow-x-auto rounded bg-muted p-2 text-xs">
          <code className={className} {...props}>
            {text}
          </code>
        </pre>
      );
    }
    return (
      <code className="rounded bg-muted px-1 py-0.5 text-[0.9em]" {...props}>
        {children}
      </code>
    );
  },
};

const remarkPlugins = [remarkGfm, remarkMath];
const rehypePlugins = [rehypeKatex];

export const MathText = memo(function MathText({
  children,
  className,
}: {
  children?: string | null;
  className?: string;
}) {
  const src = useMemo(() => (children ? normalize(children) : ""), [children]);
  if (!src) return null;
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={mdComponents}
      >
        {src}
      </ReactMarkdown>
    </span>
  );
});
