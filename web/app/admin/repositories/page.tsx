'use client'
import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Star,
  MoreHorizontal,
  Folder,
  Clock,
  User,
  RotateCcw,
  GitBranch,
  AlertTriangle,
  Languages,
  FileText,
  CheckCircle,
  Clock3,
  AlertCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { getRepositoryList, createGitRepository, updateRepository, deleteRepository, resetRepository, RepositoryInfo, CreateGitRepositoryRequest, UpdateRepositoryRequest } from '../../services/repositoryService';
import { 
  startRepositoryTranslation, 
  getRepositoryLanguageStatus, 
  getSupportedLanguages,
  LanguageStatusInfo,
  SupportedLanguage 
} from '../../services/translationService';
import Link from 'next/link';

// 仓库状态映射
const getStatusBadgeVariant = (status: number) => {
  // 根据状态返回不同颜色
  switch (status) {
    case 0: return '#CBD5E0'; // 待处理 - 灰色
    case 1: return '#63B3ED'; // 处理中 - 蓝色
    case 2: return '#68D391'; // 已完成 - 绿色
    case 3: return '#A0AEC0'; // 已取消 - 深灰色
    case 4: return '#F6AD55'; // 未授权 - 橙色
    case 99: return '#FC8181'; // 已失败 - 红色
    default: return '#CBD5E0'; // 默认灰色
  }
};

const getStatusText = (status: number) => {
  const statusMap = {
    0: '待处理',
    1: '处理中',
    2: '已完成',
    3: '已取消',
    4: '未授权',
    99: '已失败'
  };
  return statusMap[status as keyof typeof statusMap] || '未知';
};

export default function RepositoriesPage() {
  const { toast } = useToast();
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [repositories, setRepositories] = useState<RepositoryInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentRepository, setCurrentRepository] = useState<RepositoryInfo | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    isPrivate: false,
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    isPrivate: false,
  });
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [currentLanguageRepo, setCurrentLanguageRepo] = useState<RepositoryInfo | null>(null);
  const [activeLanguageTab, setActiveLanguageTab] = useState('zh-CN');
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [languageStatuses, setLanguageStatuses] = useState<LanguageStatusInfo[]>([]);
  const [loadingLanguages, setLoadingLanguages] = useState(false);
  
  // 语言代码到国旗的映射
  const languageFlags: Record<string, string> = {
    'zh-CN': '🇨🇳',
    'en-US': '🇺🇸', 
    'ja-JP': '🇯🇵',
    'ko-KR': '🇰🇷',
    'de-DE': '🇩🇪',
    'fr-FR': '🇫🇷',
    'es-ES': '🇪🇸',
    'ru-RU': '🇷🇺',
    'pt-BR': '🇧🇷',
    'it-IT': '🇮🇹',
    'ar-SA': '🇸🇦',
    'hi-IN': '🇮🇳',
    'zh-TW': '🇹🇼'
  };

  // 获取语言状态
  const getLanguageStatus = (languageCode: string) => {
    return languageStatuses.find(s => s.code === languageCode) || {
      code: languageCode,
      name: languageCode,
      status: 'none' as const,
      exists: false,
      progress: 0
    };
  };

  // 加载仓库数据
  const loadRepositories = async (page = currentPage, size = pageSize, keyword = searchText) => {
    try {
      setLoading(true);
      const { code, data } = await getRepositoryList(page, size, keyword);
      if (code === 200) {
        setRepositories(data.items);
        setTotal(data.total);
      } else {
        toast({
          title: "错误",
          description: "获取仓库列表失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('加载仓库数据失败:', error);
      toast({
        title: "错误",
        description: "加载仓库数据失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadRepositories();
  }, []);

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1); // 重置到第一页
    loadRepositories(1, pageSize, searchText);
  };

  // 加载支持的语言列表
  const loadSupportedLanguages = async () => {
    try {
      const response = await getSupportedLanguages();
      setSupportedLanguages(response);
    } catch (error) {
      console.error('加载支持的语言列表失败:', error);
      toast({
        title: "错误",
        description: "加载语言列表失败",
        variant: "destructive",
      });
    }
  };

  // 加载仓库语言状态
  const loadRepositoryLanguageStatus = async (warehouseId: string) => {
    try {
      setLoadingLanguages(true);
      const response = await getRepositoryLanguageStatus(warehouseId);
      setLanguageStatuses(response);
    } catch (error) {
      console.error('加载仓库语言状态失败:', error);
      toast({
        title: "错误",
        description: "加载语言状态失败",
        variant: "destructive",
      });
    } finally {
      setLoadingLanguages(false);
    }
  };

  // 处理多语言管理
  const handleLanguageManagement = async (repository: RepositoryInfo) => {
    setCurrentLanguageRepo(repository);
    setIsLanguageModalOpen(true);
    
    // 加载语言状态
    await loadRepositoryLanguageStatus(repository.id);
  };

  // 初始化时加载支持的语言
  useEffect(() => {
    loadSupportedLanguages();
  }, []);

  // 生成特定语言的文档
  const handleGenerateLanguage = async (languageCode: string) => {
    if (!currentLanguageRepo) return;

    try {
      const response = await startRepositoryTranslation({
        warehouseId: currentLanguageRepo.id,
        targetLanguage: languageCode,
        sourceLanguage: 'en-US'
      });

      toast({
        title: "成功",
        description: `翻译任务已启动，任务ID: ${response.taskId}`,
      });

      // 重新加载语言状态
      await loadRepositoryLanguageStatus(currentLanguageRepo.id);
    } catch (error: any) {
      console.error('生成语言文档失败:', error);
      toast({
        title: "错误",
        description: error.message || "生成文档失败，请重试",
        variant: "destructive",
      });
    }
  };

  // 重新生成特定语言的文档
  const handleRegenerateLanguage = async (languageCode: string) => {
    if (!currentLanguageRepo) return;

    try {
      const response = await startRepositoryTranslation({
        warehouseId: currentLanguageRepo.id,
        targetLanguage: languageCode,
        sourceLanguage: 'en-US'
      });

      toast({
        title: "成功",
        description: `重新翻译任务已启动，任务ID: ${response.taskId}`,
      });

      // 重新加载语言状态
      await loadRepositoryLanguageStatus(currentLanguageRepo.id);
    } catch (error: any) {
      console.error('重新生成语言文档失败:', error);
      toast({
        title: "错误",
        description: error.message || "重新生成文档失败，请重试",
        variant: "destructive",
      });
    }
  };

  // 处理仓库操作（编辑、删除等）
  const handleRepositoryAction = async (action: string, repository: RepositoryInfo) => {
    if (action === 'edit') {
      setCurrentRepository(repository);
      setEditFormData({
        name: repository.name,
        description: repository.description || '',
        isPrivate: repository.isPrivate || false,
      });
      setIsEditModalOpen(true);
    } else if (action === 'delete') {
      try {
        const response = await deleteRepository(repository.id);
        if (response.code === 200 && response.data) {
          toast({
            title: "成功",
            description: "仓库删除成功",
          });
          loadRepositories(); // 重新加载仓库列表
        } else {
          toast({
            title: "错误",
            description: response.message || "删除仓库失败",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('删除仓库失败:', error);
        toast({
          title: "错误",
          description: "删除仓库失败",
          variant: "destructive",
        });
      }
    } else if (action === 'reprocess') {
      if (confirm(`确定要重新处理仓库 ${repository.organizationName}/${repository.name} 吗？`)) {
        try {
          const response = await resetRepository(repository.id);
          if (response.code === 200 && response.data) {
            toast({
              title: "成功",
              description: "已提交重新处理请求",
            });
            loadRepositories(); // 重新加载仓库列表
          } else {
            toast({
              title: "错误",
              description: response.message || "提交重新处理请求失败",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error('重新处理仓库失败:', error);
          toast({
            title: "错误",
            description: "重新处理仓库失败",
            variant: "destructive",
          });
        }
      }
    }
  };

  // 处理创建仓库表单提交
  const handleFormSubmit = async () => {
    if (!formData.url) {
      toast({
        title: "错误",
        description: "请填写仓库地址",
        variant: "destructive",
      });
      return;
    }

    try {
      // 创建Git仓库
      const createData: CreateGitRepositoryRequest = {
        address: formData.url,
        branch: 'main', // 默认分支
      };

      const response = await createGitRepository(createData);
      if (response.code === 200) {
        toast({
          title: "成功",
          description: "仓库创建成功",
        });
        setIsModalOpen(false);
        setFormData({ name: '', url: '', description: '', isPrivate: false });
        loadRepositories(); // 重新加载仓库列表
      } else {
        toast({
          title: "错误",
          description: response.message || "创建仓库失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('提交表单失败:', error);
      toast({
        title: "错误",
        description: "操作失败，请重试",
        variant: "destructive",
      });
    }
  };

  // 处理编辑仓库表单提交
  const handleEditFormSubmit = async () => {
    if (!currentRepository) return;

    if (!editFormData.name) {
      toast({
        title: "错误",
        description: "请填写仓库名称",
        variant: "destructive",
      });
      return;
    }

    try {
      // 更新仓库
      const updateData: UpdateRepositoryRequest = {
        description: editFormData.description,
        isRecommended: false, // 默认值
        prompt: '', // 默认值
      };

      const response = await updateRepository(currentRepository.id, updateData);
      if (response.code === 200) {
        toast({
          title: "成功",
          description: "仓库更新成功",
        });
        setIsEditModalOpen(false);
        setCurrentRepository(null);
        setEditFormData({ name: '', description: '', isPrivate: false });
        loadRepositories(); // 重新加载仓库列表
      } else {
        toast({
          title: "错误",
          description: response.message || "更新仓库失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('提交表单失败:', error);
      toast({
        title: "错误",
        description: "操作失败，请重试",
        variant: "destructive",
      });
    }
  };

  // 创建新仓库
  const handleAddRepository = () => {
    setFormData({ name: '', url: '', description: '', isPrivate: false });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">仓库管理</h1>
        <p className="text-sm text-muted-foreground mt-2">
          管理Git仓库和文档处理状态
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              仓库列表
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索仓库名称"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-8 w-80"
                />
              </div>
              <Button onClick={handleSearch} variant="outline">
                搜索
              </Button>
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddRepository}>
                    <Plus className="h-4 w-4 mr-2" />
                    添加仓库
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加Git仓库</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">仓库名称</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="请输入仓库名称"
                      />
                    </div>
                    <div>
                      <Label htmlFor="url">仓库地址</Label>
                      <Input
                        id="url"
                        value={formData.url}
                        onChange={(e) => setFormData({...formData, url: e.target.value})}
                        placeholder="https://github.com/user/repo.git"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">描述</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        placeholder="仓库描述（可选）"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isPrivate"
                        checked={formData.isPrivate}
                        onCheckedChange={(checked) => setFormData({...formData, isPrivate: checked})}
                      />
                      <Label htmlFor="isPrivate">私有仓库</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                        取消
                      </Button>
                      <Button onClick={handleFormSubmit}>
                        创建
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>仓库名称</TableHead>
                <TableHead>Git地址</TableHead>
                <TableHead>描述</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>文档数</TableHead>
                <TableHead>分支</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead>错误信息</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repositories.map((repo) => (
                <TableRow key={repo.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Link href={`/admin/repositories/${repo.id}`} className="font-medium hover:underline">
                          {repo.organizationName}/{repo.name}
                        </Link>
                        {repo.isRecommended && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs text-yellow-600">推荐</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {repo.address || '暂无地址'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {repo.description || '暂无描述'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge color={getStatusBadgeVariant(repo.status)}>
                        {getStatusText(repo.status)}
                      </Badge>
                      {repo.status === 99 && repo.error && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="h-4 w-4 text-destructive cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-sm max-w-xs">{repo.error.substring(0, 100)}...</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {repo.documentCount || 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {repo.branch || 'main'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(repo.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {repo.error && repo.status === 99 ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            查看错误
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-2xl max-h-[80vh]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              仓库处理错误详情
                            </AlertDialogTitle>
                            <AlertDialogDescription className="mt-4">
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">仓库信息：</h4>
                                  <p className="text-sm">
                                    <span className="font-medium">{repo.organizationName}/{repo.name}</span>
                                    {repo.branch && <span className="ml-2 text-muted-foreground">({repo.branch})</span>}
                                  </p>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm mb-2">错误详情：</h4>
                                  <div className="bg-muted p-4 rounded-md max-h-96 overflow-y-auto">
                                    <pre className="text-sm whitespace-pre-wrap break-words font-mono">
                                      {repo.error}
                                    </pre>
                                  </div>
                                </div>
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogAction>关闭</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => window.open(`/admin/repositories/${repo.id}`, '_blank')}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRepositoryAction('edit', repo)}>
                          <Edit className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRepositoryAction('reprocess', repo)}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          重新处理
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleLanguageManagement(repo)}>
                          <Languages className="h-4 w-4 mr-2" />
                          多语言管理
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRepositoryAction('delete', repo)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* 分页控件 */}
          {total > 0 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                总共 {total} 条记录，每页 {pageSize} 条
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentPage > 1) {
                      const newPage = currentPage - 1;
                      setCurrentPage(newPage);
                      loadRepositories(newPage);
                    }
                  }}
                  disabled={currentPage === 1}
                >
                  上一页
                </Button>
                <div className="text-sm">
                  第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (currentPage < Math.ceil(total / pageSize)) {
                      const newPage = currentPage + 1;
                      setCurrentPage(newPage);
                      loadRepositories(newPage);
                    }
                  }}
                  disabled={currentPage >= Math.ceil(total / pageSize)}
                >
                  下一页
                </Button>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(value) => {
                    const newSize = parseInt(value);
                    setPageSize(newSize);
                    setCurrentPage(1);
                    loadRepositories(1, newSize);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10条</SelectItem>
                    <SelectItem value="20">20条</SelectItem>
                    <SelectItem value="50">50条</SelectItem>
                    <SelectItem value="100">100条</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 编辑仓库对话框 */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑仓库</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">仓库名称</Label>
              <Input
                id="editName"
                value={editFormData.name}
                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                placeholder="请输入仓库名称"
                disabled
              />
            </div>
            <div>
              <Label htmlFor="editDescription">描述</Label>
              <Input
                id="editDescription"
                value={editFormData.description}
                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                placeholder="仓库描述（可选）"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="editIsPrivate"
                checked={editFormData.isPrivate}
                onCheckedChange={(checked) => setEditFormData({...editFormData, isPrivate: checked})}
              />
              <Label htmlFor="editIsPrivate">私有仓库</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                取消
              </Button>
              <Button onClick={handleEditFormSubmit}>
                更新
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 多语言管理对话框 */}
      <Dialog open={isLanguageModalOpen} onOpenChange={setIsLanguageModalOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              多语言管理 - {currentLanguageRepo?.organizationName}/{currentLanguageRepo?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {loadingLanguages ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 animate-spin" />
                  <span>加载语言状态中...</span>
                </div>
              </div>
            ) : (
            <Tabs value={activeLanguageTab} onValueChange={setActiveLanguageTab} className="w-full">
              {/* 改进的Tab导航设计 */}
              <div className="border-b border-border mb-6">
                <TabsList className="h-auto p-1 bg-transparent w-full justify-start">
                  <div className="flex flex-wrap gap-1 w-full">
                    {supportedLanguages.map((language) => (
                      <TabsTrigger
                        key={language.code}
                        value={language.code}
                        className="flex items-center gap-2 px-3 py-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md"
                      >
                        <span className="text-base">{languageFlags[language.code] || '🌐'}</span>
                        <span className="font-medium">{language.name}</span>
                      </TabsTrigger>
                    ))}
                  </div>
                </TabsList>
              </div>

              {supportedLanguages.map((language) => {
                const status = getLanguageStatus(language.code);
                return (
                  <TabsContent key={language.code} value={language.code} className="mt-0">
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-3">
                            <span className="text-3xl">{languageFlags[language.code] || '🌐'}</span>
                            <div>
                              <h3 className="text-lg font-semibold">{language.name}</h3>
                              <p className="text-sm text-muted-foreground">{language.code}</p>
                            </div>
                          </CardTitle>
                          {/* 状态指示器 */}
                          <div className="flex items-center gap-2">
                            {status.status === 'completed' && (
                              <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                已完成
                              </Badge>
                            )}
                            {status.status === 'generating' && (
                              <Badge className="bg-muted text-muted-foreground border-border hover:bg-muted">
                                <Clock3 className="h-3 w-3 mr-1 animate-spin" />
                                生成中
                              </Badge>
                            )}
                            {status.status === 'failed' && (
                              <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                生成失败
                              </Badge>
                            )}
                            {status.status === 'none' && (
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-300">
                                未生成
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* 状态概览卡片 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <Label className="text-sm font-medium text-muted-foreground">文档状态</Label>
                            <div className="mt-1 text-sm font-medium">
                              {status.exists ? '✅ 已生成文档' : '📝 暂未生成文档'}
                            </div>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <Label className="text-sm font-medium text-muted-foreground">最后生成时间</Label>
                            <div className="mt-1 text-sm font-medium">
                              {status.lastGenerated ? new Date(status.lastGenerated).toLocaleDateString('zh-CN') : '暂无'}
                            </div>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <Label className="text-sm font-medium text-muted-foreground">处理状态</Label>
                            <div className="mt-1 text-sm font-medium">
                              {status.status === 'completed' && '✅ 完成'}
                              {status.status === 'generating' && '🔄 处理中'}
                              {status.status === 'failed' && '❌ 失败'}
                              {status.status === 'none' && '⏳ 待处理'}
                            </div>
                          </div>
                        </div>

                        {/* 操作按钮区域 */}
                        <div className="flex flex-wrap gap-3 pt-2">
                          {status.exists ? (
                            <>
                              <Button
                                onClick={() => {
                                  // TODO: 打开查看文档页面
                                  window.open(`/docs/${currentLanguageRepo?.id}?lang=${language.code}`, '_blank');
                                }}
                                variant="outline"
                                className="flex items-center gap-2"
                              >
                                <Eye className="h-4 w-4" />
                                查看文档
                              </Button>
                              <Button
                                onClick={() => handleRegenerateLanguage(language.code)}
                                disabled={status.status === 'generating' || loadingLanguages}
                                className="flex items-center gap-2"
                              >
                                <RotateCcw className="h-4 w-4" />
                                重新生成
                              </Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => handleGenerateLanguage(language.code)}
                              disabled={status.status === 'generating' || loadingLanguages}
                              className="flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              生成文档
                            </Button>
                          )}
                          
                          {status.status === 'generating' && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-muted text-muted-foreground rounded-md text-sm">
                              <Clock3 className="h-4 w-4 animate-spin" />
                              正在生成中，预计需要3-5分钟...
                              {status.progress > 0 && ` (${status.progress}%)`}
                            </div>
                          )}
                        </div>

                        {/* 功能说明 */}
                        <div className="pt-4 border-t">
                          <Label className="text-sm font-medium text-muted-foreground mb-3 block">支持功能</Label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                              <span>README文档翻译</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span>API文档生成</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span>代码注释翻译</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span>项目结构说明</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>
            )}
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setIsLanguageModalOpen(false)}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
