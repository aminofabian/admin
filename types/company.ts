export interface Company {
  id: number;
  username: string;
  email: string;
  project_name: string;
  project_domain: string;
  admin_project_domain: string;
  is_active: boolean;
  created: string;
  modified?: string;
}

export interface CreateCompanyRequest {
  project_name: string;
  project_domain: string;
  admin_project_domain: string;
  username: string;
  password: string;
  email: string;
  service_email: string;
  service_name: string;
  game_api_url?: string;
  game_api_key?: string;
  service_creds?: string;
  logo?: File;
}

export interface UpdateCompanyRequest {
  project_name?: string;
  project_domain?: string;
  admin_project_domain?: string;
  username?: string;
  email?: string;
  service_email?: string;
  service_name?: string;
  is_active?: boolean;
}

