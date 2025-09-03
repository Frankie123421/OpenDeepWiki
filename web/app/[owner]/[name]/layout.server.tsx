import Link from 'next/link';
import { documentCatalog } from '../../services/warehouseService';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';

import { Flexbox } from 'react-layout-kit';
import MCPModal from './MCPModal';
import FeishuBotModal from './FeishuBotModal';
import ExportMarkdownButton from '@/app/components/ExportMarkdownButton';
import TimeDisplay from '@/app/components/TimeDisplay';
import RepositoryLanguageSwitcher from './RepositoryLanguageSwitcher';

export async function getRepositoryData(owner: string, name: string, branch?: string, languageCode?: string) {
  try {
    const { data } = await documentCatalog(owner, name, branch, languageCode);
    return {
      catalogData: data || null,
      lastUpdated: data?.lastUpdate ?? "",
      supportedLanguages: data?.supportedLanguages || [],
      hasI18nSupport: data?.hasI18nSupport || false,
      currentLanguage: data?.currentLanguage || 'zh-CN'
    };
  } catch (error) {
    console.error('Failed to fetch document catalog:', error);
    return {
      catalogData: null,
      lastUpdated: '',
      supportedLanguages: [],
      hasI18nSupport: false,
      currentLanguage: 'zh-CN'
    };
  }
}

export default async function RepositoryLayoutServer({
  owner,
  name,
  children,
  branch,
  searchParams
}: any) {

  const languageCode = searchParams?.lang || 'zh-CN';
  const { catalogData, lastUpdated, supportedLanguages, hasI18nSupport, currentLanguage } = await getRepositoryData(owner, name, branch, languageCode);

  const processTreeItems = (items: any[]): any[] => {
    return items.map((item: any) => ({
      name: <Link href={`/${owner}/${name}/${item.url}`}>{item.label}</Link>,
      url: `/${owner}/${name}/${item.url}`,
      defaultOpen: true,
      type: (item.children && item.children.length > 0) ? 'folder' : 'file',
      children: item.children && item.children.length > 0 ? processTreeItems(item.children) : undefined
    }));
  };


  const tree = [
    {
      name: '思维导图',
      url: `/${owner}/${name}/mindmap`,
      defaultOpen: false,
      type: 'file',
    },
    {
      type: 'separator',
    },
    ...processTreeItems(catalogData?.items ?? [])
  ];

  return (<DocsLayout

    nav={{
      title: `${owner}/${name}`,
    }}
    searchToggle={{
      enabled: true,
    }}
    githubUrl={catalogData?.git}
    links={[
      {
        type: 'custom',
        secondary: true,
        children: <Flexbox
          gap={8}
          >
          <div className="text-center">
            <TimeDisplay
              dateString={lastUpdated}
              className="text-sm text-gray-500"
              showPrefix={true}
            />
          </div>
          <Flexbox
            align={'center'}
            gap={8}
            horizontal
          >
            {hasI18nSupport && (
              <RepositoryLanguageSwitcher 
                supportedLanguages={supportedLanguages}
                currentLanguage={currentLanguage}
              />
            )}
            <ExportMarkdownButton warehouseId={catalogData.warehouseId} />
            <MCPModal owner={owner} name={name} />
            <FeishuBotModal owner={owner} name={name} />
          </Flexbox>
        </Flexbox>
      }
    ]}
    tree={
      {
        name: 'docs',
        children: tree,
      }
    }
  >
    {children}
  </DocsLayout>
  );
}