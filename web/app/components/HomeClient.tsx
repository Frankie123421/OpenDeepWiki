'use client'

import { useState, useEffect } from 'react';
import { Github, Star, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import RepositoryForm from './RepositoryForm';
import RepositoryList from './RepositoryList';
import LastRepoModal from './LastRepoModal';
import LanguageSwitcher from './LanguageSwitcher';
import UserAvatar from './UserAvatar';
import { Repository, RepositoryFormValues } from '../types';
import { submitWarehouse, Customsubmitwarehouse, UploadAndSubmitWarehouse } from '../services/warehouseService';
import { HomeStats } from '../services/statsService';
import { homepage } from '../const/urlconst';
import { useTranslation } from '../i18n/client';
import { useSearchParams } from 'next/navigation';

// 页脚链接配置
const footerLinks = {
  product: [
    { titleKey: 'footer.features', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { titleKey: 'footer.guide', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { titleKey: 'footer.changelog', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
  ],
  resources: [
    { titleKey: 'footer.docs', link: 'https://token-ai.feishu.cn/wiki/space/7534927001112150018' },
    { titleKey: 'footer.api', link: 'https://github.com/AIDotNet/OpenDeepWiki/blob/main/README.md' },
    { titleKey: 'footer.faq', link: 'https://github.com/AIDotNet/OpenDeepWiki/issues' },
  ],
  company: [
    { titleKey: 'footer.about', link: 'https://github.com/OpenDeepWiki' },
    { titleKey: 'footer.contact', link: 'mailto:239573049@qq.com' },
    { titleKey: 'footer.join', link: 'https://github.com/AIDotNet/OpenDeepWiki/issues' },
  ],
};

// 赞助商配置
const sponsors = [
  {
    name: 'AntSK',
    logo: 'https://antsk.cn/logo.ico',
    url: 'https://antsk.cn/',
    descriptionKey: 'home.sponsors.antsk.description'
  },
  {
    name: '302.AI',
    logo: 'https://302.ai/logo.ico',
    url: 'https://302.ai/',
    descriptionKey: 'home.sponsors.302ai.description'
  },
  {
    name: '痴者工良',
    logo: 'https://www.whuanle.cn/wp-content/uploads/2020/04/image-1586681324216.png',
    url: 'https://www.whuanle.cn/',
    descriptionKey: 'home.sponsors.whuanle.description'
  }
];

interface HomeClientProps {
  initialRepositories: Repository[];
  initialTotal: number;
  initialPage: number;
  initialPageSize: number;
  initialSearchValue: string;
  initialStats?: Partial<HomeStats>;
}

export default function HomeClient({
  initialRepositories,
  initialTotal,
  initialPage,
  initialPageSize,
  initialSearchValue,
  initialStats
}: HomeClientProps) {
  const repositories = initialRepositories;
  const [formVisible, setFormVisible] = useState(false);
  const [lastRepoModalVisible, setLastRepoModalVisible] = useState(false);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [searchValue, setSearchValue] = useState<string>(initialSearchValue);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation();

  // 监听URL参数变化，更新i18n语言
  useEffect(() => {
    const locale = searchParams.get('locale');
    if (locale) {
      i18n.changeLanguage(locale);
    } else {
      const browserLang = navigator.language;
      const lang = browserLang.includes('zh') ? 'zh-CN' : 'en-US';
      i18n.changeLanguage(lang);
    }
  }, [searchParams, i18n]);

  const handleAddRepository = async (values: RepositoryFormValues) => {
    try {
      let response: any;
      
      if (values.submitType === 'git') {
        // Git仓库提交
        response = await submitWarehouse(values);
        if (response.data?.code === 200) {
          toast.success(t('home.messages.repo_add_success'));
          window.location.reload();
        } else {
          toast.error(response.data?.message || t('home.messages.repo_add_failed', { error: response.error || t('home.messages.unknown_error') }));
        }
      } else if (values.submitType === 'custom') {
        // 自定义仓库提交
        response = await Customsubmitwarehouse(values);
        if (response.data?.code === 200) {
          toast.success(t('home.messages.repo_add_success'));
          window.location.reload();
        } else {
          toast.error(response.data?.message || t('home.messages.repo_add_failed', { error: response.error || t('home.messages.unknown_error') }));
        }
      } else {
        // 压缩包上传
        const formData = new FormData();
        formData.append('organization', values.organization!);
        formData.append('repositoryName', values.repositoryName!);
        
        if (values.uploadMethod === 'file' && values.file) {
          formData.append('file', values.file);
        } else if (values.uploadMethod === 'url' && values.fileUrl) {
          formData.append('fileUrl', values.fileUrl);
        }
        
        response = await UploadAndSubmitWarehouse(formData);
        if (response.data?.code === 200) {
          toast.success(t('home.messages.repo_add_success'));
          window.location.reload();
        } else {
          toast.error(response.data?.message || t('home.messages.repo_add_failed', { error: response.error || t('home.messages.unknown_error') }));
        }
      }
    } catch (error) {
      console.error('添加仓库出错:', error);
      toast.error(t('home.messages.repo_add_error'));
    }
    setFormVisible(false);
  };

  const handleLastRepoQuery = () => {
    setLastRepoModalVisible(true);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.location.href = `/?page=${page}&pageSize=${pageSize}&keyword=${searchValue}`;
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
    setPageSize(initialPageSize);
    window.location.href = `/?page=${1}&pageSize=${initialPageSize}&keyword=${value}`;
  };

  // 计算统计数据
  const stats = {
    totalRepositories: initialStats?.totalRepositories || initialTotal || repositories.length,
    openDeepWikiStars: initialStats?.openDeepWikiStars || 0,
  };

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/logo.png" alt="OpenDeepWiki" />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold">ODW</AvatarFallback>
              </Avatar>
              <h1 className="text-xl font-bold text-foreground">OpenDeepWiki</h1>
            </div>

            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              <Button variant="outline" size="sm" asChild>
                <a href={homepage} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4 mr-2" />
                  <Star className="h-4 w-4 mr-1" />
                  <span>
                    {stats.openDeepWikiStars >= 1000
                      ? stats.openDeepWikiStars >= 10000
                        ? `${Math.floor(stats.openDeepWikiStars / 1000)}k`
                        : `${(stats.openDeepWikiStars / 1000).toFixed(1)}k`
                      : stats.openDeepWikiStars.toString()
                    }
                  </span>
                </a>
              </Button>
              <UserAvatar />
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero 区域 */}
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-foreground">
              {t('home.title')}
            </h2>
          </div>

          <div style={{
            marginBottom: '20px'
          }} className="flex flex-col lg:flex-row gap-4 items-center justify-center">
            <div className="flex-1 min-w-0 max-w-lg">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('home.repo_list.search_placeholder')}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchValue)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setFormVisible(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('home.add_repo_button')}
              </Button>
              <Button
                variant="outline"
                onClick={handleLastRepoQuery}
              >
                {t('home.query_last_repo_button')}
              </Button>
            </div>
          </div>

          {/* 仓库列表 */}
          {repositories.length === 0 ? (
            <Card className="border-dashed border-2 border-muted-foreground/25 bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
                <div className="rounded-full bg-muted p-4 mb-6">
                  <div className="text-4xl">📚</div>
                </div>
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {searchValue ? t('home.repo_list.not_found', { keyword: searchValue }) : t('home.repo_list.empty')}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {searchValue ? t('home.repo_list.try_adjust_keywords') : t('home.repo_list.get_started')}
                    </p>
                  </div>
                  <Button
                    onClick={() => setFormVisible(true)}
                    size="lg"
                    className="mt-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t('home.repo_list.add_now')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div>
                <RepositoryList repositories={repositories} />
              </div>
              {!searchValue && initialTotal > pageSize && (
                <div className="mt-8 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      {currentPage > 1 && (
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => handlePageChange(currentPage - 1)}
                          />
                        </PaginationItem>
                      )}

                      {Array.from({ length: Math.ceil(initialTotal / pageSize) }).map((_, index) => {
                        const page = index + 1;
                        if (
                          page === 1 ||
                          page === Math.ceil(initialTotal / pageSize) ||
                          Math.abs(page - currentPage) <= 2
                        ) {
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={currentPage === page}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}

                      {currentPage < Math.ceil(initialTotal / pageSize) && (
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => handlePageChange(currentPage + 1)}
                          />
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}

          {/* 模态框 */}
          <RepositoryForm
            open={formVisible}
            onCancel={() => setFormVisible(false)}
            onSubmit={handleAddRepository}
          />

          <LastRepoModal
            open={lastRepoModalVisible}
            onCancel={() => setLastRepoModalVisible(false)}
          />

          {/* 二维码预览模态框 */}
          <Dialog open={qrCodeModalVisible} onOpenChange={setQrCodeModalVisible}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center">
                  {t('home.community.qr_preview_title')}
                </DialogTitle>
              </DialogHeader>
              <div className="flex justify-center p-4">
                <img 
                  src="/feishu.jpg" 
                  alt={t('home.community.qr_alt')}
                  className="w-80 h-80 object-contain rounded-lg"
                />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                {t('home.community.scan_tip')}
              </p>
            </DialogContent>
          </Dialog>
        </main>

        {/* 页脚 */}
        <footer className="bg-background/80 backdrop-blur-md border-t mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* 交流群区域 */}
            <div className="mb-8">
              <div className="flex justify-center">
                <Card className="card-modern max-w-md">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <img 
                        src="/feishu.jpg" 
                        alt={t('home.community.qr_alt')}
                        className="w-20 h-20 object-contain rounded-lg flex-shrink-0 cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setQrCodeModalVisible(true)}
                        title={t('home.community.click_to_enlarge')}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground mb-1 text-sm">
                          {t('home.community.join_group')}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {t('home.community.description')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 赞助商区域 */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-center mb-8 text-foreground">
                {t('home.sponsors.title')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {sponsors.map((sponsor, index) => (
                  <Card key={index} className="card-modern">
                    <CardContent className="p-6">
                      <a
                        href={sponsor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center space-y-3 group"
                      >
                        <Avatar className="h-12 w-12 mx-auto">
                          <AvatarImage src={sponsor.logo} alt={sponsor.name} />
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            {sponsor.name.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {sponsor.name}
                          </h4>
                          <p className="text-sm text-muted-foreground">{t(sponsor.descriptionKey)}</p>
                        </div>
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator className="my-12" />

            {/* 页脚链接 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/logo.png" alt="OpenDeepWiki" />
                    <AvatarFallback className="bg-primary text-primary-foreground">ODW</AvatarFallback>
                  </Avatar>
                  <h4 className="text-lg font-semibold text-foreground">OpenDeepWiki</h4>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  {t('description')}
                </p>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={homepage} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                  <Badge variant="secondary">
                    .NET 9.0
                  </Badge>
                  <Badge variant="outline">
                    {t('home.tags.open_source')}
                  </Badge>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-4">{t('footer.product')}</h4>
                <div className="space-y-2">
                  {footerLinks.product.map(link => (
                    <a
                      key={link.titleKey}
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t(link.titleKey)}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-4">{t('footer.resources')}</h4>
                <div className="space-y-2">
                  {footerLinks.resources.map(link => (
                    <a
                      key={link.titleKey}
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t(link.titleKey)}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-foreground mb-4">{t('footer.company')}</h4>
                <div className="space-y-2">
                  {footerLinks.company.map(link => (
                    <a
                      key={link.titleKey}
                      href={link.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {t(link.titleKey)}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* 页脚底部 */}
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-center md:text-left">
                <p className="text-sm text-muted-foreground">
                  {t('footer.copyright', { year: new Date().getFullYear() })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('footer.powered_by')}
                  <span className="text-primary font-semibold">.NET 9.0</span> &{' '}
                  <span className="text-primary font-semibold">Semantic Kernel</span>
                </p>
              </div>

              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <a href="/privacy" className="hover:text-primary transition-colors">
                  {t('footer.privacy')}
                </a>
                <span>•</span>
                <a href="/terms" className="hover:text-primary transition-colors">
                  {t('footer.terms')}
                </a>
                <span>•</span>
                <span className="text-muted-foreground">v2.0.0</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <Toaster />
    </>
  );
}