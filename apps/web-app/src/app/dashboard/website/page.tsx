import { redirect } from 'next/navigation';

export default function WebsiteDashboardRoot() {
  redirect('/dashboard/website/settings');
}
