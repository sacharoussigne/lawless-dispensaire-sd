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
  Button,
  TextInput,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { IconEdit, IconCheck, IconX, IconClipboardCheck, IconTools } from '@tabler/icons-react';
import { getItemsWithStock, updateStock, craftItem } from '@/app/_actions/stock';
import { handleAction } from '@/lib/action';
import { notifications } from '@mantine/notifications';
import CraftModal from './modals/CraftModal';
import type { ItemWithRelations, CategoryWithItems } from '@/types/stock';
import { usePermissions } from '@/app/_contexts/PermissionsContext';

interface StockPageClientProps {
  initialItems: ItemWithRelations[];
}

export default function StockPageClient({ initialItems }: StockPageClientProps) {
  const { permissions } = usePermissions();
  const [items, setItems] = useState<ItemWithRelations[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stockValues, setStockValues] = useState<Record<string, number | ''>>({});
  const [saving, setSaving] = useState(false);
  const [craftModalOpened, setCraftModalOpened] = useState(false);

  // État pour stocker les valeurs d'input brutes (avec expressions)
  const [stockInputValues, setStockInputValues] = useState<Record<string, string>>({});

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
        message: error.message || 'Erreur lors du chargement des objets',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // Initialiser les valeurs de stock avec les valeurs actuelles
  useEffect(() => {
    if (isEditing && items.length > 0) {
      const initialValues: Record<string, number | ''> = {};
      items.forEach((item) => {
        initialValues[item.id] = item.stockToday !== null ? item.stockToday : '';
      });
      setStockValues(initialValues);
    }
  }, [isEditing, items]);

  const handleSaveStock = async () => {
    try {
      setSaving(true);
      const stockData = Object.entries(stockValues)
        .filter(([_, value]) => value !== '' && value !== null)
        .map(([itemId, quantity]) => ({
          itemId,
          quantity: typeof quantity === 'number' ? quantity : 0,
        }));

      if (stockData.length === 0) {
        notifications.show({
          title: 'Avertissement',
          message: 'Aucun stock à sauvegarder',
          color: 'yellow',
        });
        return;
      }

      const result = await updateStock(stockData);
      handleAction(result);

      notifications.show({
        title: 'Succès',
        message: 'Stock mis à jour avec succès',
        color: 'green',
      });

      setIsEditing(false);
      setStockValues({});
      await loadItems();
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la sauvegarde du stock',
        color: 'red',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setStockValues({});
  };

  // Fonction pour évaluer une expression mathématique simple de manière sécurisée
  const evaluateExpression = (expression: string): number | '' => {
    if (!expression || expression.trim() === '') return '';
    
    // Nettoyer l'expression : enlever les espaces
    const cleaned = expression.replace(/\s/g, '');
    
    // Vérifier que l'expression contient uniquement des caractères autorisés
    // Permettre les chiffres, +, -, *, /, (, ), et le point pour les décimales
    if (!/^[\d+\-*/().]+$/.test(cleaned)) {
      return '';
    }

    try {
      // Utiliser Function constructor pour évaluer de manière plus sécurisée que eval()
      // On limite aux calculs mathématiques de base
      const result = new Function('return ' + cleaned)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result); // Arrondir pour les entiers
      }
      return '';
    } catch {
      return '';
    }
  };

  const handleStockInputChange = (itemId: string, value: string) => {
    // Stocker la valeur brute pour l'affichage
    setStockInputValues((prev) => ({
      ...prev,
      [itemId]: value,
    }));

    // Si l'expression contient des opérateurs, évaluer et stocker le résultat
    const trimmed = value.trim();
    if (trimmed === '') {
      setStockValues((prev) => ({
        ...prev,
        [itemId]: '',
      }));
    } else if (/[\+\-\*\/]/.test(trimmed)) {
      // Contient des opérateurs mathématiques, évaluer l'expression
      const result = evaluateExpression(trimmed);
      setStockValues((prev) => ({
        ...prev,
        [itemId]: result,
      }));
    } else {
      // Sinon, convertir en nombre
      const parsed = Number(trimmed);
      const numValue = isNaN(parsed) ? '' : parsed;
      setStockValues((prev) => ({
        ...prev,
        [itemId]: numValue,
      }));
    }
  };

  // Initialiser les valeurs d'input brutes
  useEffect(() => {
    if (isEditing && items.length > 0) {
      const initialInputValues: Record<string, string> = {};
      items.forEach((item) => {
        initialInputValues[item.id] = item.stockToday !== null ? String(item.stockToday) : '';
      });
      setStockInputValues(initialInputValues);
    }
  }, [isEditing, items]);

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

  // Trier les catégories par ordre puis par nom
  const sortedCategories = Object.values(itemsByCategory).sort((a, b) => {
    // Si les deux ont un ordre, trier par ordre
    if (a.category.order !== undefined && b.category.order !== undefined) {
      return a.category.order - b.category.order;
    }
    // Si seulement a a un ordre, a vient en premier
    if (a.category.order !== undefined) return -1;
    // Si seulement b a un ordre, b vient en premier
    if (b.category.order !== undefined) return 1;
    // Sinon, trier par nom
    return a.category.name.localeCompare(b.category.name, 'fr', { sensitivity: 'base' });
  });

  // Trier les items dans chaque catégorie par ordre puis par nom
  sortedCategories.forEach((cat) => {
    cat.items.sort((a, b) => {
      // Si les deux ont un ordre, trier par ordre
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Si seulement a a un ordre, a vient en premier
      if (a.order !== undefined) return -1;
      // Si seulement b a un ordre, b vient en premier
      if (b.order !== undefined) return 1;
      // Sinon, trier par nom
      return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
    });
  });

  // Compter les items avec stock fait aujourd'hui
  const itemsWithStockToday = items.filter((item) => item.stockToday !== null).length;
  const totalItems = items.length;

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Stock</Title>
        <Group>
          {itemsWithStockToday > 0 && (
            <Badge
              color={itemsWithStockToday === totalItems ? 'green' : 'yellow'}
              variant="light"
              size="lg"
            >
              {itemsWithStockToday}/{totalItems} objets stockés aujourd'hui
            </Badge>
          )}
          {!isEditing ? (
            <Group>
              {(permissions?.stock.craftRead || permissions?.stock.craftWrite) && (
                <Button
                  leftSection={<IconTools size={16} />}
                  onClick={() => setCraftModalOpened(true)}
                  variant="light"
                  color="blue"
                >
                  Craft
                </Button>
              )}
              {permissions?.stock.update && (
                <Button
                  leftSection={<IconEdit size={16} />}
                  onClick={() => setIsEditing(true)}
                  variant="light"
                >
                  {itemsWithStockToday > 0 ? 'Mettre à jour le stock' : 'Faire le stock'}
                </Button>
              )}
            </Group>
          ) : (
            <Group>
              <Button
                leftSection={<IconX size={16} />}
                onClick={handleCancelEdit}
                variant="subtle"
                color="gray"
              >
                Annuler
              </Button>
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleSaveStock}
                loading={saving}
                variant="filled"
                color="green"
              >
                Sauvegarder
              </Button>
            </Group>
          )}
        </Group>
      </Group>

      {loading ? (
        <Text>Chargement...</Text>
      ) : sortedCategories.length === 0 ? (
        <Text c="dimmed">Aucun objet trouvé</Text>
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
                    {categoryData.items.length} objet(s)
                  </Text>
                </Group>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Nom</Table.Th>
                      <Table.Th>Quantité idéale</Table.Th>
                      <Table.Th>Stock J-1</Table.Th>
                      <Table.Th>Stock aujourd'hui</Table.Th>
                      {isEditing && permissions?.stock.update && <Table.Th>Nouveau stock</Table.Th>}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {categoryData.items.map((item) => {
                      const hasStockToday = item.stockToday !== null;
                      
                      // Déterminer le stock à utiliser pour vérifier si c'est bas
                      // Utiliser stockToday si disponible, sinon stockYesterday si disponible
                      const currentStock = item.stockToday !== null 
                        ? item.stockToday 
                        : (item.stockYesterday !== null ? item.stockYesterday : null);
                      
                      const isStockLow = currentStock !== null && currentStock < item.idealQuantity;
                      
                      // Déterminer la couleur selon le type d'item
                      let backgroundColor: string | undefined = undefined;
                      if (isStockLow) {
                        // Items craftables OU items non-craftables sans groupe d'entreprise
                        if (item.isCraftable || (item.companyGroupId === null)) {
                          backgroundColor = '#fff3cd'; // Jaune clair
                        } 
                        // Items non-craftables avec groupe d'entreprise
                        else if (!item.isCraftable && item.companyGroupId !== null) {
                          backgroundColor = '#f8d7da'; // Rouge clair
                        }
                      }
                      
                      return (
                        <Table.Tr 
                          key={item.id}
                          style={{
                            backgroundColor,
                          }}
                        >
                          <Table.Td>
                            <Group gap="xs">
                              <Text fw={500}>{item.name}</Text>
                              {hasStockToday && (
                                <Tooltip label="Stock déjà fait aujourd'hui">
                                  <Badge
                                    color="green"
                                    variant="light"
                                    size="sm"
                                    leftSection={<IconClipboardCheck size={12} />}
                                  >
                                    Fait
                                  </Badge>
                                </Tooltip>
                              )}
                            </Group>
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
                              <Text fw={hasStockToday ? 600 : undefined}>
                                {item.stockToday}
                              </Text>
                            ) : (
                              <Text c="dimmed">?</Text>
                            )}
                          </Table.Td>
                          {isEditing && permissions?.stock.update && (
                            <Table.Td>
                              <TextInput
                                value={stockInputValues[item.id] ?? (item.stockToday !== null ? String(item.stockToday) : '')}
                                onChange={(e) => handleStockInputChange(item.id, String(e.currentTarget.value))}
                                onBlur={(e) => {
                                  // Quand on quitte le champ, évaluer l'expression et mettre à jour l'affichage
                                  const inputValue = e.currentTarget.value.trim();
                                  if (inputValue === '') {
                                    setStockInputValues((prev) => ({
                                      ...prev,
                                      [item.id]: '',
                                    }));
                                  } else if (/[\+\-\*\/]/.test(inputValue)) {
                                    const result = evaluateExpression(inputValue);
                                    if (result !== '') {
                                      setStockInputValues((prev) => ({
                                        ...prev,
                                        [item.id]: String(result),
                                      }));
                                    }
                                  }
                                }}
                                placeholder="Quantité (ex: 30 + 45)"
                                style={{ maxWidth: 150 }}
                                rightSection={
                                  hasStockToday ? (
                                    <Tooltip label="Mise à jour du stock existant">
                                      <ActionIcon size="sm" variant="subtle" color="blue">
                                        <IconEdit size={14} />
                                      </ActionIcon>
                                    </Tooltip>
                                  ) : undefined
                                }
                              />
                            </Table.Td>
                          )}
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Paper>
            );
          })}
        </Stack>
      )}

      <CraftModal
        opened={craftModalOpened}
        onClose={() => setCraftModalOpened(false)}
        items={items}
        canCraft={permissions?.stock.craftWrite ?? false}
        onCraft={async (itemId, recipeId, times) => {
          if (!permissions?.stock.craftWrite) {
            notifications.show({
              title: 'Permission refusée',
              message: 'Vous n\'avez pas la permission d\'effectuer un craft.',
              color: 'red',
            });
            return;
          }
          try {
            const result = await craftItem({
              craftedItemId: itemId,
              recipeId,
              times,
            });
            
            if (result.status === 200 && 'data' in result && result.data && 'quantityProduced' in result.data) {
              notifications.show({
                title: 'Succès',
                message: `Craft effectué avec succès ! ${result.data.quantityProduced} objet(s) produit(s).`,
                color: 'green',
              });
              setCraftModalOpened(false);
              await loadItems(); // Recharger les items pour mettre à jour les stocks
            } else {
              const errorMessage = 'error' in result 
                ? (typeof result.error === 'string' ? result.error : 'Erreur lors du craft')
                : 'Erreur lors du craft';
              notifications.show({
                title: 'Erreur',
                message: errorMessage,
                color: 'red',
              });
            }
          } catch (error: any) {
            notifications.show({
              title: 'Erreur',
              message: error.message || 'Erreur lors du craft',
              color: 'red',
            });
          }
        }}
      />
    </Container>
  );
}

