'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Title, Stack, Paper, Text, ScrollArea, Button, Group, Grid } from '@mantine/core';
import { IconCopy, IconCheck, IconArrowLeft } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { TemplateFormGenerator } from '../../../components/TemplateFormGenerator';
import { renderTemplate, RenderContext } from '@/lib/mailTemplate/renderer';
import { extractInputs } from '@/lib/mailTemplate/parser';
import type { MailTemplate } from '@/types/mailTemplates';
import { routes } from '@/types/routes';

interface TestTemplatePageClientProps {
    template: MailTemplate;
}

export default function TestTemplatePageClient({
    template,
}: TestTemplatePageClientProps) {
    const router = useRouter();
    const [renderedContent, setRenderedContent] = useState<string>('');
    const [copied, setCopied] = useState(false);

    const hasInputs = useMemo(() => {
        if (!template) return false;
        return extractInputs(template.content).length > 0;
    }, [template?.content]);

    const initialContent = useMemo(() => {
        if (!template) return '';
        if (!hasInputs) {
            const context: RenderContext = { inputs: {} };
            return renderTemplate(template.content, context);
        }
        return '';
    }, [template?.content, hasInputs]);

    useEffect(() => {
        if (!hasInputs && initialContent) {
            setRenderedContent(initialContent);
        }
    }, [hasInputs, initialContent]);

    const handleChange = (content: string) => {
        setRenderedContent(content);
    };

    const handleCopy = async () => {
        if (!renderedContent) return;

        try {
            await navigator.clipboard.writeText(renderedContent);
            setCopied(true);
            notifications.show({
                title: 'Succès',
                message: 'Courrier copié dans le presse-papiers',
                color: 'green',
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            notifications.show({
                title: 'Erreur',
                message: 'Impossible de copier le courrier',
                color: 'red',
            });
        }
    };

    return (
        <Container size="xl" py="xl">
            <Stack gap="md">
                <Group justify="space-between">
                    <Button
                        variant="subtle"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => router.push(routes.employee.mails)}
                    >
                        Retour
                    </Button>
                    {(renderedContent || (!hasInputs && initialContent)) && (
                        <Button
                            leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                            onClick={handleCopy}
                            variant={copied ? 'light' : 'default'}
                            color={copied ? 'green' : undefined}
                        >
                            {copied ? 'Copiée !' : 'Copier le courrier'}
                        </Button>
                    )}
                </Group>

                <Title order={1}>Modèle "{template.name}"</Title>

                {hasInputs ? (
                    <Grid gutter="xl">
                        <Grid.Col span={5}>
                            <Stack gap="md">
                                <Text size="sm" fw={600}>
                                    Formulaire
                                </Text>
                                <Paper p="md" withBorder>
                                    <ScrollArea h={600}>
                                        <TemplateFormGenerator
                                            template={template.content}
                                            onChange={handleChange}
                                            onCancel={() => { }}
                                        />
                                    </ScrollArea>
                                </Paper>
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={7}>
                            <Stack gap="md">
                                <Text size="sm" fw={600}>
                                    Aperçu
                                </Text>
                                <Paper p="md" withBorder>
                                    <ScrollArea h={600}>
                                        <Text style={{ whiteSpace: 'pre-wrap' }}>
                                            {renderedContent || 'Remplissez le formulaire pour voir l\'aperçu...'}
                                        </Text>
                                    </ScrollArea>
                                </Paper>
                            </Stack>
                        </Grid.Col>
                    </Grid>
                ) : (
                    <Stack gap="md">
                        <Paper p="md" withBorder>
                            <Text size="sm" fw={600} mb="xs">
                                Contenu généré :
                            </Text>
                            <ScrollArea h={600}>
                                <Text style={{ whiteSpace: 'pre-wrap' }}>
                                    {renderedContent || initialContent}
                                </Text>
                            </ScrollArea>
                        </Paper>
                        <Group justify="flex-end">
                            <Button
                                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                                onClick={handleCopy}
                                variant={copied ? 'light' : 'default'}
                                color={copied ? 'green' : undefined}
                            >
                                {copied ? 'Copiée !' : 'Copier le courrier'}
                            </Button>
                            <Button variant="subtle" onClick={() => router.push(routes.employee.mails)}>
                                Fermer
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Stack>
        </Container>
    );
}
