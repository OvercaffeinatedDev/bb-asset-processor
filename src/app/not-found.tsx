import { Card, CardBody } from '@heroui/react';
import { IconMoodSad } from '@tabler/icons-react';

export default async function Home() {
  return (
    <section className="flex flex-1 items-center justify-center">
      <Card className="mx-auto mt-4 max-w-4xl p-4">
        <CardBody className="text-center">
          <h1 className="mb-4 flex justify-center gap-2 text-5xl">
            Page not found <IconMoodSad size={48} />
          </h1>
          <p className="text-2xl">
            The page you are looking for does not exist.
          </p>
        </CardBody>
      </Card>
    </section>
  );
}
