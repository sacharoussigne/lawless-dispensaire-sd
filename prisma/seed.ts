import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const itemTypes = [
    {name: 'Matériel médical'},
    {name: 'Composants'},
    {name: 'Plantes'},
    {name: 'General store'},
    {name: 'Tisserie'},
    {name: 'Cueilleterie'},
    {name: 'Autres'},
]


const categories = [
    {
        name: 'Matériel médical',
        items: [
            {
                name: "Trousse de soin",
                idealQuantity: 16,
                isCraftable: true,
            },
            {
                name: "Lait de Pavot",
                idealQuantity: 12,
                isCraftable: true,
            },
            {
                name: "Fiole d'ammoniaque",
                idealQuantity: 12,
                isCraftable: true,
            },
            {
                name: "Canne",
                idealQuantity: 12,
                isCraftable: true,
            },
            {
                name: "Infusion au ginseng",
                idealQuantity: 30,
                isCraftable: true, // Attention 2 recettes
            },
            {
                name: "Bandage amélioré",
                idealQuantity: 30,
                isCraftable: true,
            },
            {
                name: "Bandage",
                idealQuantity: 30,
                isCraftable: true,
            },
            {
                name: "Papier médecin",
                idealQuantity: 10,
                isCraftable: true,
            }
        ]
    },
    {
        name: 'Composants',
        items: [
            {
                name: "Balais",
                idealQuantity: 1,
            },
            {
                name: "Lotion antiseptique",
                idealQuantity: 100,
                isCraftable: true,
            },
            {
                name: "Fil de pêche",
                idealQuantity: 20,
            },
            {
                name: "Tissus solide",
                idealQuantity: 80,
            },
            {
                name: "Tonneau d'étanol",
                idealQuantity: 10,
            },
            {
                name: "Pelle à crotte",
                idealQuantity: 1,
            }
        ]
    },
    {
        name: "Plantes",
        items: [
            {name: "Bardane", idealQuantity: 60},
            {name: "Camomille sauvage", idealQuantity: 40},
            {name: "Ginseng américain", idealQuantity: 40},
            {name: "Jonc commun", idealQuantity: 20},
            {name: "Menthe sauvage", idealQuantity: 100},
            {name: "Pavot des champs", idealQuantity: 6},
            {name: "Thym suavage", idealQuantity: 100},
            {name: "Pavot", idealQuantity: 5},
            {name: "Coton", idealQuantity: 5},
        ]
    }
]
const items = [
]