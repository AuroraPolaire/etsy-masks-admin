import { Card, CardBody, CardHeader } from './ui/Card';

export const HowToUse = () => (
  <Card>
    <CardHeader>
      <h2 className="text-base font-bold text-slate-950">How to use</h2>
    </CardHeader>
    <CardBody>
      <ol className="space-y-2 text-sm text-slate-700">
        <li>1. Edit the product brief and mask topic list.</li>
        <li>2. Paste an OpenAI API key for this session.</li>
        <li>3. Generate images from each topic prompt.</li>
        <li>4. Approve images after manual review.</li>
        <li>5. Generate PDFs and marketplace previews.</li>
        <li>6. Export the ZIP and manually upload the files to Etsy.</li>
      </ol>
    </CardBody>
  </Card>
);
