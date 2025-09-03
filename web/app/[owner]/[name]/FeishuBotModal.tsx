"use client"
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CopyIcon, CheckIcon, InfoIcon } from 'lucide-react';
import { useTranslation } from '@/app/i18n/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FeishuBotModal = ({
  owner,
  name
}: {
  owner: string;
  name: string;
}) => {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);

  // 构建飞书Bot的WebHook地址
  const feishuBotUrl = `${typeof window !== 'undefined' ? window.location.protocol : 'https:'}//${typeof window !== 'undefined' ? window.location.host : ''}/api/feishu-bot/${owner}/${name}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(feishuBotUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
        >
          {t('repository_layout.feishu_bot.modal_title').replace(' 配置', '')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>{t('repository_layout.feishu_bot.modal_title')}</DialogTitle>
          <DialogDescription>
            {t('repository_layout.feishu_bot.support_message')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 mt-2">
          <Alert className="border rounded-lg py-2">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              <p className="text-sm">
                {t('repository_layout.feishu_bot.support_message')}
              </p>
            </AlertDescription>
          </Alert>

          <Card className="py-3">
            <CardHeader className="pb-2 px-4">
              <CardTitle className="text-base">{t('repository_layout.feishu_bot.tutorial.title')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4">
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-sm mb-2">{t('repository_layout.feishu_bot.tutorial.step1.title')}</p>
                  <div className="relative bg-muted p-3 rounded-lg border">
                    <code className="font-mono text-xs break-all">
                      {feishuBotUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={copyToClipboard}
                      title={copied ? t('repository_layout.feishu_bot.tutorial.step1.copied_tooltip') : t('repository_layout.feishu_bot.tutorial.step1.copy_tooltip')}
                    >
                      {copied ?
                        <CheckIcon className="h-3 w-3 text-green-500" /> :
                        <CopyIcon className="h-3 w-3" />
                      }
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-sm mb-2">{t('repository_layout.feishu_bot.tutorial.step2.title')}</p>
                  <ul className="text-xs space-y-1 pl-4">
                    {(t('repository_layout.feishu_bot.tutorial.step2.instructions', { returnObjects: true }) as string[]).map((instruction: string, index: number) => (
                      <li key={index}>• {instruction}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-sm mb-2">{t('repository_layout.feishu_bot.tutorial.step3.title')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('repository_layout.feishu_bot.tutorial.step3.description')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeishuBotModal;