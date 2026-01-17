/*
  Warnings:

  - Added the required column `recipeName` to the `craft_recipe` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "craft_recipe" ADD COLUMN     "recipeDescription" TEXT,
ADD COLUMN     "recipeName" TEXT NOT NULL;
