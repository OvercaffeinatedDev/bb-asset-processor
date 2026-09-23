import { Card, CardBody } from '@heroui/react';
import { IconPackage } from '@tabler/icons-react';

export default async function Home() {
  return (
    <Card className="mx-auto mt-4 max-w-4xl">
      <CardBody className="text-center">
        <h1 className="mb-4 flex justify-center gap-2 text-5xl">
          Hello World! <IconPackage size={48} />
        </h1>
      </CardBody>
    </Card>
  );
}
