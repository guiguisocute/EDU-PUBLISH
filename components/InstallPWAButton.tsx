import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { usePWAInstall } from '@/hooks/use-pwa-install';

const InstallIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24">
        <path fill="currentColor" d="M18 1.01L8 1c-1.1 0-2 .9-2 2v3h2V5h10v14H8v-1H6v3c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99M10 15h2V8H5v2h3.59L3 15.59L4.41 17L10 11.41z" />
    </svg>
);

export const InstallPWAButton: React.FC = () => {
    const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
    const { toast } = useToast();

    if (isInstalled) {
        return null;
    }

    const handleClick = async () => {
        if (isInstallable) {
            const success = await install();
            if (!success) {
                toast({
                    title: '安装未完成',
                    description: '你可以在浏览器菜单中手动选择“安装应用”或“添加到主屏幕”。',
                });
            }
            return;
        }

        if (isIOS) {
            toast({
                title: '添加到主屏幕',
                description: 'Safari 点“分享”->“添加到主屏幕”。',
            });
            return;
        }

        toast({
            title: '添加到主屏幕',
            description: '请在浏览器菜单中选择“安装应用”或“添加到主屏幕”。',
        });
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleClick}
            className="gap-1.5 h-8 text-xs font-semibold px-3"
            title="添加至手机"
        >
            添加至手机
            <InstallIcon className="w-4 h-4" />
        </Button>
    );
};
