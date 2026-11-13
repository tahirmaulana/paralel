import { redirect } from 'next/navigation';

export default function UserAdminPage() {
  redirect('/dashboard?workspace=USER_ADMIN');
}
