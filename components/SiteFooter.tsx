import React from 'react';
import { siteConfig } from '../lib/site-config';

export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={className ?? "py-4 text-center text-xs text-muted-foreground border-t"}>
      <p>
        {siteConfig.footer.copyright}
        {siteConfig.footer.links.map((link) => (
          <span key={link.url}>
            {' · '}
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          </span>
        ))}
      </p>
    </footer>
  );
}
