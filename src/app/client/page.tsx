'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clientAuth } from '@/lib/api';
import { PasswordGate } from '@/components/client/PasswordGate';
import { ClientGalleryView } from '@/components/client/ClientGalleryView';

function ClientGalleryContent() {
    const searchParams = useSearchParams();
    const galleryId = searchParams.get('id');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [galleryTitle, setGalleryTitle] = useState('');

    useEffect(() => {
        if (!galleryId) {
            setLoading(false);
            return;
        }

        clientAuth.check()
            .then((data) => {
                if (data.authenticated && data.galleryId === galleryId) {
                    setIsAuthenticated(true);
                }
            })
            .catch(() => {
                // Not authenticated
            })
            .finally(() => {
                setLoading(false);
            });
    }, [galleryId]);

    if (!galleryId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-neutral-900 mb-2">Gallery Not Found</h1>
                    <p className="text-neutral-600">Please provide a gallery ID.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50">
                <div className="animate-pulse text-neutral-400">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return (
            <PasswordGate
                galleryId={galleryId}
                onAuthenticated={(title) => {
                    setGalleryTitle(title);
                    setIsAuthenticated(true);
                }}
            />
        );
    }

    return <ClientGalleryView galleryId={galleryId} initialTitle={galleryTitle} />;
}

export default function ClientPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <ClientGalleryContent />
        </Suspense>
    );
}
