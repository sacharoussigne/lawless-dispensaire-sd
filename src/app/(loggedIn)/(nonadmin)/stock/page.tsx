'use client';

import { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Table,
  Group,
  Text,
  Badge,
  Stack,
} from '@mantine/core';
import { getItemsWithStock } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import type { Item, CategoryItem } from '@prisma/client';

interface ItemWithRelations extends Item {
  category: { id: string; name: string; color: string } | null;
  companyGroup: { id: string; name: string } | null;
  stockToday: number | null;
  stockYesterday: number | null;
}

interface CategoryWithItems {
  category: { id: string; name: string; color: string };
  items: ItemWithRelations[];
}

export default function StockPage() {
  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    try {
      setLoading(true);
      const result = await getItemsWithStock();
      const data = handleAction(result);
      if (data) {
        setItems(data);
      }
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors du chargement des items',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Fonction pour calculer la luminosité d'une couleur hexadécimale
  const getLuminance = (hex: string): number => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const [rs, gs, bs] = [r, g, b].map((val) => {
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Fonction pour déterminer si le texte doit être blanc ou noir selon la couleur de fond
  const getTextColor = (backgroundColor: string): string => {
    const luminance = getLuminance(backgroundColor);
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Grouper les items par catégorie
  const itemsByCategory = items.reduce((acc, item) => {
    if (!item.category) return acc;
    
    const categoryId = item.category.id;
    if (!acc[categoryId]) {
      acc[categoryId] = {
        category: item.category,
        items: [],
      };
    }
    acc[categoryId].items.push(item);
    return acc;
  }, {} as Record<string, CategoryWithItems>);

  // Trier les catégories par nom
  const sortedCategories = Object.values(itemsByCategory).sort((a, b) =>
    a.category.name.localeCompare(b.category.name, 'fr', { sensitivity: 'base' })
  );

  // Trier les items dans chaque catégorie par nom
  sortedCategories.forEach((cat) => {
    cat.items.sort((a, b) =>
      a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
    );
  });

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">
        Stock
      </Title>

      {loading ? (
        <Text>Chargement...</Text>
      ) : sortedCategories.length === 0 ? (
        <Text c="dimmed">Aucun item trouvé</Text>
      ) : (
        <Stack gap="xl">
          {sortedCategories.map((categoryData) => {
            const textColor = getTextColor(categoryData.category.color);
            return (
              <Paper key={categoryData.category.id} shadow="sm" p="md" withBorder>
                <Group mb="md">
                  <Badge
                    style={{
                      backgroundColor: categoryData.category.color,
                      color: textColor,
                    }}
                    variant="filled"
                    size="lg"
                  >
                    {categoryData.category.name}
                  </Badge>
                  <Text c="dimmed" size="sm">
                    {categoryData.items.length} item(s)
                  </Text>
                </Group>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Nom</Table.Th>
                      <Table.Th>Quantité idéale</Table.Th>
                      <Table.Th>Stock J-1</Table.Th>
                      <Table.Th>Stock aujourd'hui</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {categoryData.items.map((item) => (
                      <Table.Tr key={item.id}>
                        <Table.Td>
                          <Text fw={500}>{item.name}</Text>
                        </Table.Td>
                        <Table.Td>{item.idealQuantity}</Table.Td>
                        <Table.Td>
                          {item.stockYesterday !== null ? (
                            <Text>{item.stockYesterday}</Text>
                          ) : (
                            <Text c="dimmed">?</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {item.stockToday !== null ? (
                            <Text>{item.stockToday}</Text>
                          ) : (
                            <Text c="dimmed">?</Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Container>
  );
}

