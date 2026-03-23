Crée une migration Prisma après modification du schema.

Instructions :
1. Lis le fichier `server/prisma/schema.prisma` pour comprendre les changements
2. Lance `cd server && npx prisma migrate dev --name $ARGUMENTS` pour créer la migration
3. Si la migration échoue, analyse l'erreur et propose une solution
4. Lance `npx prisma generate` pour régénérer le client Prisma
5. Vérifie que le serveur démarre correctement
6. Résume les changements de schema à l'utilisateur

Si $ARGUMENTS est vide, demande un nom descriptif pour la migration.
