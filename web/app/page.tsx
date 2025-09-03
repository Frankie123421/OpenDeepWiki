'use server'

import { getWarehouse } from './services/warehouseService';
import { getBasicHomeStats } from './services/statsService';
import HomeClient from './components/HomeClient';
import { cookies } from 'next/headers';

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  // 确保 searchParams 已经被解析
  const resolvedSearchParams = searchParams ? await searchParams : {};

  // 从 URL 参数中获取分页信息
  const page = Number(resolvedSearchParams?.page) || 1;
  const pageSize = Number(resolvedSearchParams?.pageSize) || 20;
  const keyword = (resolvedSearchParams?.keyword as string) || '';

  // 获取cookie用于服务端API认证
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;
  
  // 构造完整的cookie字符串
  const cookieString = [
    token ? `token=${token}` : '',
    refreshToken ? `refreshToken=${refreshToken}` : ''
  ].filter(Boolean).join('; ');

  // 并行获取初始数据和统计数据
  const [response, statsData] = await Promise.all([
    getWarehouse(page, pageSize, keyword, cookieString),
    getBasicHomeStats(cookieString)
  ]);

  const initialRepositories = response.success ? response.data.items : [];
  const initialTotal = response.success ? response.data.total : 0;

  return (
      <HomeClient
        initialRepositories={initialRepositories}
        initialTotal={initialTotal}
        initialPage={page}
        initialPageSize={pageSize}
        initialSearchValue={keyword}
        initialStats={statsData}
      />  
  );
}