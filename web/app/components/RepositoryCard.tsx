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
  Calendar,
  ExternalLink,
  FileText,
  Star,
  GitBranch,
  Clock
} from 'lucide-react';

interface RepositoryCardProps {
  repository: Repository;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({ repository }) => {

  const { t, i18n } = useTranslation();
  const currentLocale = i18n.language;

  // 根据地址获取头像
  const getAvatarUrl = () => {
    if (repository?.avatarUrl) {
      return repository.avatarUrl;
    }

    if (repository.address?.includes('github.com')) {
      const owner = repository.organizationName;
      if (owner) {
        return `https://github.com/${owner}.png`;
      }
    } else if (repository.address?.includes('gitee.com')) {
      const owner = repository.organizationName;
      if (owner) {
        return `https://gitee.com/${owner}.png`;
      }
    } else if (repository.address?.includes('gitea.com')) {
      const owner = repository.organizationName;
      if (owner) {
        return `https://gitea.com/${owner}.png`;
      }
    } else if (repository.address?.includes('gitlab.com')) {
      const owner = repository.organizationName;
      if (owner) {
        return `https://gitlab.com/${owner}.png`;
      }
    }
    return null;
  };

  const avatarUrl = useMemo(() => getAvatarUrl(), [repository.address, repository.organizationName]);

  const getStatusNumber = (status: string | number): number => {
    if (typeof status === 'number') return status;
    return parseInt(status, 10) || 0;
  };

  // 获取状态配置 - 使用标准shadcn variants
  const getStatusConfig = (status: string | number) => {
    const statusNumber = getStatusNumber(status);
    switch (statusNumber) {
      case 0: return {
        variant: 'secondary' as const,
        text: t('repository.status.pending', '待处理')
      };
      case 1: return {
        variant: 'default' as const,
        text: t('repository.status.processing', '处理中')
      };
      case 2: return {
        variant: 'default' as const,
        text: t('repository.status.completed', '已完成'),
        className: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200 dark:border-green-800'
      };
      case 3: return {
        variant: 'outline' as const,
        text: t('repository.status.cancelled', '已取消')
      };
      case 4: return {
        variant: 'default' as const,
        text: t('repository.status.unauthorized', '未授权'),
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      };
      case 99: return {
        variant: 'destructive' as const,
        text: t('repository.status.failed', '已失败')
      };
      default: return {
        variant: 'outline' as const,
        text: t('repository.status.unknown', '未知状态')
      };
    }
  };

  const formatDate = (dateString: string) => {
    return formatRelativeTime(dateString, currentLocale);
  };

  const getRepoIcon = () => {
    if (repository.address?.includes('github.com')) {
      return <Github className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    } else if (repository.address?.includes('gitee.com')) {
      return <div className="h-4 w-4 bg-gray-600 dark:bg-gray-400 rounded-sm flex items-center justify-center">
        <span className="text-white text-xs font-bold">G</span>
      </div>;
    } else {
      return <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const statusConfig = getStatusConfig(repository.status);

  const handleCardClick = () => {
    window.location.href = `/${repository.organizationName}/${repository.name}`;
  };

  const handleExternalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(repository.address, '_blank');
  };

  return (
    <Card
      className="group cursor-pointer transition-all duration-150 hover:shadow-md hover:shadow-black/5 border border-border/60 hover:border-border bg-card hover:bg-card/80 backdrop-blur-sm"
      onClick={handleCardClick}
    >
      <CardContent className="p-6">
        {/* Header: Avatar, Name, Status */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-12 w-12 shrink-0 ring-1 ring-border/20">
            <AvatarImage src={avatarUrl || ''} alt={repository.organizationName} />
            <AvatarFallback className="bg-muted text-muted-foreground font-medium">
              {repository.organizationName?.slice(0, 2)?.toUpperCase() || 'RE'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors leading-tight">
                {repository.name || t('repository.unknown_name', '未知仓库名称')}
              </h3>
              <Badge 
                variant={statusConfig.variant}
                className={`shrink-0 text-xs ${statusConfig.className || ''}`}
              >
                {statusConfig.text}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getRepoIcon()}
              <span className="font-medium">{repository.organizationName}</span>
            </div>
          </div>
        </div>

        {/* Content: Description */}
        {repository.description && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {repository.description}
            </p>
          </div>
        )}

        {/* Footer: Stats and Metadata */}
        <div className="space-y-3 pt-3 border-t border-border/40">
          {/* Stats Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <Star className="h-4 w-4" fill="currentColor" />
                <span className="font-medium">{repository.stars || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <GitFork className="h-4 w-4" />
                <span className="font-medium">{repository.forks || 0}</span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
              onClick={handleExternalClick}
              title={t('repository.view_source', '查看源码')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {repository.branch && (
              <div className="flex items-center gap-1.5">
                <GitBranch className="h-3.5 w-3.5" />
                <span className="font-mono">{repository.branch}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatDate(repository.createdAt)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepositoryCard;