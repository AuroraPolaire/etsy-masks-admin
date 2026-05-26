import { Card, CardBody, CardHeader } from './ui/Card';

export const HowToUse = () => (
  <Card>
    <CardHeader>
      <h2 className="text-base font-bold text-ink-strong">How to use</h2>
    </CardHeader>
    <CardBody>
      <ol className="space-y-2 text-sm text-ink-base">
        <li>1. Draft the listing brief.</li>
        <li>2. Add mask topics.</li>
        <li>3. Use backend AI generation or upload images manually.</li>
        <li>4. Generate or upload images and approve one per topic.</li>
        <li>5. Create PDFs and marketplace previews.</li>
        <li>6. Export the final ZIP for Etsy upload.</li>
      </ol>
    </CardBody>
  </Card>
);
