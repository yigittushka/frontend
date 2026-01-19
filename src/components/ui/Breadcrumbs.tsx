"use client";

import Link from "next/link";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    if (items.length === 0) return null;
    
    return (
        <nav className="breadcrumbs" aria-label="Навигация">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                
                return (
                    <span key={index} className="breadcrumb-item">
                        {item.href && !isLast ? (
                            <Link href={item.href} className="breadcrumb-link">
                                {item.label}
                            </Link>
                        ) : (
                            <span className={isLast ? "breadcrumb-current" : ""}>
                                {item.label}
                            </span>
                        )}
                        {!isLast && <span className="breadcrumb-separator">/</span>}
                    </span>
                );
            })}
        </nav>
    );
}
