import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

const footerLinks = [
  [
    { label: 'Audio Description', href: '#' },
    { label: 'Investor Relations', href: '#' },
    { label: 'Legal Notices', href: '#' },
  ],
  [
    { label: 'Help Center', href: '#' },
    { label: 'Jobs', href: '#' },
    { label: 'Cookie Preferences', href: '#' },
  ],
  [
    { label: 'Gift Cards', href: '#' },
    { label: 'Terms of Use', href: '/terms' },
    { label: 'Corporate Information', href: '#' },
  ],
  [
    { label: 'Media Center', href: '#' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Contact Us', href: '#' },
  ],
];

const socialLinks = [
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#141414] text-[#808080] py-12 md:py-16">
      <div className="max-w-[980px] mx-auto px-4 md:px-8">
        {/* Social Links - Netflix style */}
        <div className="flex gap-6 mb-6">
          {socialLinks.map(({ icon: Icon, href, label }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-gray-400 transition-colors"
              aria-label={label}
            >
              <Icon className="w-6 h-6" />
            </a>
          ))}
        </div>

        {/* Links Grid - Netflix 4-column layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {footerLinks.map((column, colIndex) => (
            <div key={colIndex} className="space-y-3">
              {column.map((link) => (
                <div key={link.href + link.label}>
                  {link.href.startsWith('/') ? (
                    <Link
                      to={link.href}
                      className="text-[13px] hover:underline block"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      className="text-[13px] hover:underline block"
                    >
                      {link.label}
                    </a>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Service Code Button - Netflix style */}
        <button className="border border-[#808080] text-[13px] px-2 py-1 mb-6 hover:text-white transition-colors">
          Service Code
        </button>

        {/* Copyright */}
        <p className="text-[11px]">
          © {new Date().getFullYear()} KANIFLIX. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
