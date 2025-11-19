# TailAdmin - Estrutura Completa
# Fonte: attached_assets/free-react-tailwind-admin-dashboard-main/

## REGRA DE OURO
**TODO O VISUAL DEVE SER USADO SOMENTE DO TAILADMIN**
- Localização: `attached_assets/free-react-tailwind-admin-dashboard-main/`
- Usar SOMENTE componentes, estilos e assets do TailAdmin
- Copiar código EXATAMENTE como está no TailAdmin
- Não usar outras bibliotecas de componentes sem aprovação prévia

## Estrutura de Diretórios

### public/images/
- **brand/** - Logos de marcas (brand-01.svg a brand-15.svg)
- **cards/** - Imagens para cards (card-01.png, card-02.png, card-03.png)
- **carousel/** - Imagens de carrossel (carousel-01 a 04.png)
- **chat/** - Avatares de chat (chat-01 a 05.png)
- **country/** - Bandeiras de países (country-01 a 08.svg)
- **error/** - Páginas de erro (404, 500, 503, maintenance, success) light e dark
- **grid-image/** - Imagens de grid layout
- **icons/** - Ícones diversos
- **logo/** - Logos principais
  - `logo.svg` - Logo principal
  - `logo-dark.svg` - Logo modo escuro
  - `logo-icon.svg` - Ícone da logo
  - `auth-logo.svg` - Logo para páginas de autenticação (EXACT TailAdmin)
- **product/** - Imagens de produtos
- **shape/** - Formas e padrões
  - `grid-01.svg` - Grid pattern para backgrounds
- **task/** - Ícones de tarefas
- **user/** - Avatares de usuários
- **video-thumb/** - Thumbnails de vídeo

### src/components/

#### auth/
- `SignInForm.tsx` - Formulário de login (EXACT TailAdmin)
- `SignUpForm.tsx` - Formulário de registro

#### charts/
- **bar/** - `BarChartOne.tsx`
- **line/** - `LineChartOne.tsx`

#### common/
- `ChartTab.tsx` - Tabs para gráficos
- `ComponentCard.tsx` - Card wrapper para componentes
- `GridShape.tsx` - Grid pattern component (EXACT TailAdmin)
- `PageBreadCrumb.tsx` - Breadcrumbs de navegação
- `PageMeta.tsx` - Meta tags SEO
- `ScrollToTop.tsx` - Scroll to top component
- `ThemeToggleButton.tsx` - Toggle de tema padrão
- `ThemeTogglerTwo.tsx` - Toggle de tema circular (EXACT TailAdmin)

#### ecommerce/
- `CountryMap.tsx` - Mapa de países
- `DemographicCard.tsx` - Cards demográficos
- `EcommerceMetrics.tsx` - Métricas de e-commerce
- `MonthlySalesChart.tsx` - Gráfico de vendas mensais
- `MonthlyTarget.tsx` - Meta mensal
- `RecentOrders.tsx` - Pedidos recentes
- `StatisticsChart.tsx` - Gráfico de estatísticas

#### form/
- `Form.tsx` - Form wrapper
- `Label.tsx` - Label component
- `MultiSelect.tsx` - Select múltiplo
- `Select.tsx` - Select simples
- `date-picker.tsx` - Date picker
- **form-elements/**
  - `CheckboxComponents.tsx`
  - `DefaultInputs.tsx`
  - `DropZone.tsx`
  - `FileInputExample.tsx`
  - `InputGroup.tsx`
  - `InputStates.tsx`
  - `RadioButtons.tsx`
  - `SelectOption.tsx`
  - `TextArea.tsx`
  - `ToggleSwitch.tsx`

#### header/
- Header components

#### tables/
- Table components

#### ui/
- **accordion/** - `index.tsx`
- **alert-dialog/** - `index.tsx`
- **avatar/** - `index.tsx`
- **badge/** - `index.tsx`
- **breadcrumb/** - `index.tsx`
- **button/** - `Button.tsx` (EXACT TailAdmin Button)
- **card/** - `index.tsx`
- **carousel/** - `index.tsx`
- **chat-bubble/** - `index.tsx`
- **checkbox/** - `index.tsx`
- **collapsible/** - `index.tsx`
- **command/** - `index.tsx`
- **dropdown-menu/** - `index.tsx`
- **hover-card/** - `index.tsx`
- **menubar/** - `index.tsx`
- **modal/** - `index.tsx` (EXACT TailAdmin Modal)
- **navigation-menu/** - `index.tsx`
- **pagination/** - `index.tsx`
- **popover/** - `index.tsx`
- **progress/** - `index.tsx`
- **radio-group/** - `index.tsx`
- **scroll-area/** - `index.tsx`
- **separator/** - `index.tsx`
- **sidebar/** - `index.tsx`
- **skeleton/** - `index.tsx`
- **slider/** - `index.tsx`
- **steps/** - `index.tsx`
- **switch/** - `index.tsx`
- **table/** - `index.tsx`
- **tabs/** - `index.tsx`
- **toast/** - `index.tsx`
- **toggle/** - `index.tsx`
- **tooltip/** - `index.tsx`

#### UserProfile/
- `UserAddressCard.tsx`
- `UserInfoCard.tsx`
- `UserMetaCard.tsx`

### src/pages/

#### AuthPages/
- `AuthPageLayout.tsx` - Layout de autenticação (EXACT TailAdmin)

#### Charts/
- Chart pages

#### Dashboard/
- Dashboard pages (CRM, eCommerce, etc)

#### Forms/
- Form pages

#### OtherPage/
- Error pages, coming soon, etc

#### Tables/
- Table pages

#### UiElements/
- UI element showcase pages

#### Root Pages:
- `Calendar.tsx` - Calendário (EXACT TailAdmin)
- Outras páginas do template

## Componentes Copiados para AgendaPro

### Componentes EXATOS do TailAdmin já implementados:
1. ✅ `GridShape.tsx` - Grid pattern (client/src/components/)
2. ✅ `ThemeTogglerTwo.tsx` - Theme toggle circular (client/src/components/)
3. ✅ `LoginPage.tsx` - Baseado em SignInForm + AuthPageLayout
4. ✅ `auth-logo.svg` - Logo customizada para AgendaPro mantendo estilo TailAdmin

### Cores TailAdmin (tailwind.config.ts):
```typescript
brand: {
  50: "#EEF2FF",
  400: "#818CF8",
  500: "#3C50E0",  // Primary blue
  950: "#1C2434",  // Auth background dark blue
}
```

## Próximos Componentes a Copiar (quando necessário):
- Modal (attached_assets/.../src/components/ui/modal/index.tsx)
- Button (attached_assets/.../src/components/ui/button/Button.tsx)
- Outros componentes conforme necessidade

## Arquivos de Configuração TailAdmin:
- `eslint.config.js`
- `postcss.config.js`
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- `vite.config.ts`
