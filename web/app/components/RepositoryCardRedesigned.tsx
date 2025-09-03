'use client'

import React, { useMemo } from 'react';
import { Repository } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslation } from '../i18n/client';
import { formatRelativeTime } from '../utils/timeFormat';
import {
  Github,
  GitFork,
  Star,
  ExternalLink,
  FileText,
  GitBranch,
  Clock
} from 'lucide-react';

interface RepositoryCardProps {
  repository: Repository;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repository }) => {
  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language;

  // 获取头像URL
  const getAvatarUrl = () => {
    if (repository?.avatarUrl) return repository.avatarUrl;
    
    const platformMap: Record<string, string> = {
      'github.com': 'https://github.com',
      'gitee.com': 'https://gitee.com',
      'gitlab.com': 'https://gitlab.com',
      'gitea.com': 'https://gitea.com'
    };
    
    const platform = Object.keys(platformMap).find(p => repository.address?.includes(p));
    if (platform && repository.organizationName) {
      return `${platformMap[platform]}/${repository.organizationName}.png`;
    }
    
    return null;
  };

  const avatarUrl = useMemo(() => getAvatarUrl(), [repository.address, repository.organizationName]);

  // 获取状态配置 - 简化版本
  const getStatusConfig = (status: string | number) => {
    const statusNumber = typeof status === 'number' ? status : parseInt(status, 10) || 0;
    
    const configs = {
      0: { variant: 'secondary' as const, text: t('repository.status.pending', '待处理') },
      1: { variant: 'default' as const, text: t('repository.status.processing', '处理中') },
      2: { variant: 'outline' as const, text: t('repository.status.completed', '已完成') },
      3: { variant: 'secondary' as const, text: t('repository.status.cancelled', '已取消') },
      4: { variant: 'secondary' as const, text: t('repository.status.unauthorized', '未授权') },
      99: { variant: 'destructive' as const, text: t('repository.status.failed', '已失败') }
    };
    
    return configs[statusNumber as keyof typeof configs] || {
      variant: 'outline' as const,
      text: t('repository.status.unknown', '未知状态')
    };
  };

  // 获取平台图标
  const getPlatformIcon = () => {
    if (repository.address?.includes('github.com')) {
      return <Github className="h-3.5 w-3.5" />;
    } else if (repository.address?.includes('gitee.com')) {
      return <div className="h-3.5 w-3.5 bg-current rounded-sm flex items-center justify-center">
        <span className="text-background text-[10px] font-bold">G</span>
      </div>;
    }
    return <FileText className="h-3.5 w-3.5" />;
  };

  const statusConfig = getStatusConfig(repository.status);
  const formattedDate = formatRelativeTime(repository.createdAt, currentLocale);

  const handleCardClick = () => {
    window.location.href = `/${repository.organizationName}/${repository.name}`;
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(repository.address, '_blank');
  };

  return (
    <Card
      className="group cursor-pointer transition-all duration-150 hover:shadow-md border-border/50 hover:border-border bg-card hover:bg-card/80 backdrop-blur-sm overflow-hidden"
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Header区域 - 头像、基本信息、状态 */}
        <div className="p-4 pb-3 border-b border-border/30">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 ring-1 ring-border/20 group-hover:ring-border/40 transition-all duration-150">
              <AvatarImage src={avatarUrl || ''} alt={repository.organizationName} />
              <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                {repository.organizationName?.slice(0, 2)?.toUpperCase() || 'UN'}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              {/* 仓库名称 - 主要信息 */}
              <h3 className="font-semibold text-base text-foreground leading-tight mb-1 truncate group-hover:text-primary transition-colors duration-150">
                {repository.name || t('repository.unknown_name', '未知仓库名称')}
              </h3>
              
              {/* 组织名称和平台 */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                {getPlatformIcon()}
                <span className="truncate">{repository.organizationName}</span>
              </div>
            </div>

            {/* 状态标签 - 右上角 */}
            <Badge
              variant={statusConfig.variant}
              className="text-xs px-2 py-0.5 font-medium shrink-0"
            >
              {statusConfig.text}
            </Badge>
          </div>
        </div>

        {/* 内容区域 - 描述 */}
        <div className="p-4 py-3">
          {repository.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">
              {repository.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic mb-3">
              {t('repository.no_description', '暂无描述')}
            </p>
          )}
        </div>

        {/* Footer区域 - 统计信息和操作 */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            {/* 左侧：统计信息 */}
            <div className="flex items-center gap-4">
              {/* Stars */}
              <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Star className="h-3.5 w-3.5" fill="currentColor" />
                <span className="text-sm font-medium">{repository.stars?.toLocaleString() || 0}</span>
              </div>
              
              {/* Forks */}
              <div className="flex items-center gap-1 text-muted-foreground">
                <GitFork className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">{repository.forks?.toLocaleString() || 0}</span>
              </div>

              {/* 分支信息（如果存在） */}
              {repository.branch && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <GitBranch className="h-3.5 w-3.5" />
                  <span className="text-xs font-mono max-w-16 truncate">{repository.branch}</span>
                </div>
              )}
            </div>

            {/* 右侧：操作按钮和时间 */}
            <div className="flex items-center gap-2">
              {/* 时间信息 */}
              <div className="flex items-center gap-1 text-muted-foreground/70">
                <Clock className="h-3.5 w-3.5" />
                <span className="text-xs">{formattedDate}</span>
              </div>

              {/* 外部链接 */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-60 group-hover:opacity-100 hover:bg-muted/80 transition-all duration-150"
                onClick={handleExternalClick}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepositoryCard;