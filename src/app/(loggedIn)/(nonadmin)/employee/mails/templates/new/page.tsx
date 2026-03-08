import NewTemplatePageClient from './NewTemplatePageClient';
import { SuspenseLoader } from '@/app/_components/SuspenseLoader/SuspenseLoader';

export default function NewTemplatePage() {
  return (
    <SuspenseLoader>
      <NewTemplatePageClient />
    </SuspenseLoader>
  );
}
