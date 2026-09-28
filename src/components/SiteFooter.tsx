import { Link } from "@tanstack/react-router";

const LINKS: { to: any; label: string }[] = [
  { to: "/blog", label: "Blog" },
  { to: "/jobs", label: "Job Posts" },
  { to: "/about-us", label: "About Us" },
  { to: "/contact-us", label: "Contact Us" },
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms-and-conditions", label: "Terms & Conditions" },
  { to: "/disclaimer", label: "Disclaimer" },
];

export function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-border bg-card/60">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-6 text-center md:flex-row md:justify-between md:text-left">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} SSC Mentor AI. All rights reserved.
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs font-medium text-muted-foreground transition hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
