import { Card, CardBody, CardHeader } from './ui/Card';

export const HowToUse = () => (
  <Card>
    <CardHeader>
      <h2 className="text-base font-bold text-ink-strong">How to use</h2>
    </CardHeader>
    <CardBody>
      <ol className="space-y-2 text-sm text-ink-base">
        <li>1. Draft the listing brief.</li>
        <li>2. Add mask topics in the image step.</li>
        <li>3. Use backend AI generation or upload color masks manually.</li>
        <li>4. Approve each color mask; coloring pages generate automatically when AI is ready.</li>
        <li>5. Export color PNGs, coloring-page PNGs, and one listing PDF.</li>
      </ol>
    </CardBody>
  </Card>
);
