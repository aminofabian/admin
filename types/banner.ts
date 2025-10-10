export type BannerType = 'HOMEPAGE' | 'PROMOTIONAL';
export type BannerCategory = 'DESKTOP' | 'MOBILE_RESPONSIVE' | 'MOBILE_APP';

export interface Banner {
  id: number;
  title: string;
  banner_type: BannerType;
  banner_category: BannerCategory;
  web_banner: string | null;
  mobile_banner: string | null;
  banner_thumbnail: string | null;
  redirect_url: string | null;
  is_active: boolean;
  project: number;
  created_by: number;
  created: string;
  modified: string;
}

export interface CreateBannerRequest {
  title: string;
  banner_type: BannerType;
  banner_category?: BannerCategory;
  web_banner?: File;
  mobile_banner?: File;
  banner_thumbnail?: File;
  redirect_url?: string;
  is_active?: boolean;
}

export interface UpdateBannerRequest {
  title?: string;
  banner_type?: BannerType;
  banner_category?: BannerCategory;
  redirect_url?: string;
  is_active?: boolean;
}

