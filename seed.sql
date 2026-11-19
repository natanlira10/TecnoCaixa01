-- =============================================================
-- TechnoCaixa - Produtos de exemplo (PostgreSQL / Neon)
-- Rode DEPOIS do schema.sql, uma única vez.
-- Cadastra os 37 produtos que têm foto em static/Fotos e registra
-- o estoque inicial de cada um como movimento de entrada.
-- =============================================================

BEGIN;

INSERT INTO produto (sku, nome, categoria_id, quantidade, minimo, custo, preco, local, foto)
WITH v (sku, nome, categoria, quantidade, minimo, custo, preco, local, foto) AS (VALUES
    ('PC-001', 'PC Gamer Flagship Valkyrie Olympus Extreme 4K', 'Computadores', 3, 2, 18000.00, 23999.90, 'Galpão A1', 'Fotos/PC Gamer Flagship Valkyrie Olympus Extreme 4K.jpg'),
    ('PC-002', 'Console Portátil PC Gamer Valkyrie Nomad X Handheld', 'Computadores', 6, 3, 3800.00, 4999.90, 'Galpão A2', 'Fotos/Console Portátil PC Gamer Valkyrie Nomad X Handheld.jpg'),
    ('MN-001', 'Monitor Gamer Veloce Display Pulse 24G 24pol IPS FHD 144Hz 1ms', 'Monitores', 12, 4, 650.00, 899.90, 'Galpão B1', 'Fotos/Monitor Gamer Veloce Display Pulse 24G 24pol IPS FHD 144Hz 1ms.jpg'),
    ('MN-002', 'Monitor Gamer Veloce Display Arena 25X 25pol Fast IPS FHD 240Hz 0.5ms', 'Monitores', 7, 3, 1100.00, 1499.90, 'Galpão B1', 'Fotos/Monitor Gamer Veloce Display Arena 25X 25pol Fast IPS FHD 240Hz 0.5ms.jpg'),
    ('MN-003', 'Monitor Gamer Veloce Display CrystalQ 27 27pol Fast IPS QHD 180Hz 1ms', 'Monitores', 5, 3, 1400.00, 1899.90, 'Galpão B2', 'Fotos/Monitor Gamer Veloce Display CrystalQ 27 27pol Fast IPS QHD 180Hz 1ms.jpg'),
    ('MN-004', 'Monitor Gamer Veloce Display Lumina 27 QD-OLED 27pol QD-OLED Gen-3 QHD 360Hz 0.03ms', 'Monitores', 2, 2, 4200.00, 5499.90, 'Galpão B2', 'Fotos/Monitor Gamer Veloce Display Lumina 27 QD-OLED 27pol QD-OLED Gen-3 QHD 360Hz 0.03ms.jpg'),
    ('MN-005', 'Monitor eSports Pro Veloce Display Z-Pro 25 UltraStrobing 24.5pol E-TN FHD 540Hz 0.2ms', 'Monitores', 1, 2, 3900.00, 4999.90, 'Galpão B3', 'Fotos/Monitor eSports Pro Veloce Display Z-Pro 25 UltraStrobing 24.5pol E-TN FHD 540Hz 0.2ms.jpg'),
    ('PE-001', 'Processador AMD Ryzen 5 5600', 'Peças', 20, 6, 650.00, 849.90, 'Armário C1', 'Fotos/Processador AMD Ryzen 5 5600.jpg'),
    ('PE-002', 'Processador AMD Ryzen 5 7600X', 'Peças', 9, 4, 1150.00, 1499.90, 'Armário C1', 'Fotos/Processador AMD Ryzen 5 7600X.jpg'),
    ('PE-003', 'Placa-Mãe Kronos Hardware B550M Titan VRM', 'Peças', 8, 3, 700.00, 949.90, 'Armário C2', 'Fotos/Placa-Mãe Kronos Hardware B550M Titan VRM.jpg'),
    ('PE-004', 'Placa-Mãe Kronos Hardware B650M Vanguard WiFi', 'Peças', 4, 3, 1100.00, 1449.90, 'Armário C2', 'Fotos/Placa-Mãe Kronos Hardware B650M Vanguard WiFi.jpg'),
    ('PE-005', 'Placa de Vídeo Flagship Kronos Hardware GeForce RTX 5090 Hall of Fame Extreme 32GB GDDR7 512-bit', 'Peças', 2, 1, 16000.00, 19999.90, 'Cofre D1', 'Fotos/Placa de Vídeo Flagship Kronos Hardware GeForce RTX 5090 Hall of Fame Extreme 32GB GDDR7 512-bit.jpg'),
    ('PE-006', 'Fonte Kronos Hardware VoltMaster 850W 80 Plus Gold Full Modular ATX 3.1', 'Peças', 10, 4, 600.00, 799.90, 'Armário C3', 'Fotos/Fonte Kronos Hardware VoltMaster 850W 80 Plus Gold Full Modular ATX 3.1.jpg'),
    ('PE-007', 'Water Cooler Kronos Hardware HydroVision 360 Pro LCD IPS 2.8pol 360mm ARGB', 'Peças', 3, 3, 850.00, 1199.90, 'Armário C3', 'Fotos/Water Cooler Kronos Hardware HydroVision 360 Pro LCD IPS 2.8pol 360mm ARGB.jpg'),
    ('PE-008', 'Kit Memória RAM Nexus Core Stealth 16GB (2x8GB) DDR4 3200MHz CL16', 'Peças', 16, 5, 220.00, 319.90, 'Armário C4', 'Fotos/Kit Memória RAM Nexus Core Stealth 16GB (2x8GB) DDR4 3200MHz CL16.jpg'),
    ('PE-009', 'Kit Memória RAM Nexus Core Prism RGB 32GB (2x16GB) DDR5 6000MHz CL30', 'Peças', 10, 4, 720.00, 999.90, 'Armário C4', 'Fotos/Kit Memória RAM Nexus Core Prism RGB 32GB (2x16GB) DDR5 6000MHz CL30.jpg'),
    ('PE-010', 'Kit Memória RAM Nexus Core Titanium Pro 64GB (2x32GB) DDR5 6400MHz CL32', 'Peças', 4, 2, 1400.00, 1899.90, 'Armário C4', 'Fotos/Kit Memória RAM Nexus Core Titanium Pro 64GB (2x32GB) DDR5 6400MHz CL32.jpg'),
    ('PE-011', 'SSD Nexus Core Velocity E4 1TB M.2 NVMe PCIe 4.0', 'Peças', 18, 6, 330.00, 469.90, 'Armário C5', 'Fotos/SSD Nexus Core Velocity E4 1TB M.2 NVMe PCIe 4.0.jpg'),
    ('PE-012', 'SSD Nexus Core HyperDrive Pro 2TB M.2 NVMe PCIe 4.0 + DRAM', 'Peças', 8, 3, 780.00, 1099.90, 'Armário C5', 'Fotos/SSD Nexus Core HyperDrive Pro 2TB M.2 NVMe PCIe 4.0 + DRAM.jpg'),
    ('PE-013', 'SSD Flagship Nexus Core WarpSpeed Gen5 2TB M.2 NVMe PCIe 5.0', 'Peças', 3, 2, 1550.00, 2199.90, 'Cofre D2', 'Fotos/SSD Flagship Nexus Core WarpSpeed Gen5 2TB M.2 NVMe PCIe 5.0.jpg'),
    ('PE-014', 'Gabinete Gamer Kronos Hardware CrystalView Panoramic Dual-Chamber Mid-Tower Aquário', 'Peças', 7, 3, 490.00, 699.90, 'Galpão A3', 'Fotos/Gabinete Gamer Kronos Hardware CrystalView Panoramic Dual-Chamber Mid-Tower Aquário.jpg'),
    ('PE-015', 'Gabinete Gamer Kronos Hardware WindStorm Mesh Airflow + 4 Fans 140mm ARGB', 'Peças', 11, 4, 340.00, 479.90, 'Galpão A3', 'Fotos/Gabinete Gamer Kronos Hardware WindStorm Mesh Airflow + 4 Fans 140mm ARGB.jpg'),
    ('PF-001', 'Mouse Gamer Sem Fio Aether Labs FeatherLight X Pro 8K Carbon', 'Periféricos', 15, 5, 450.00, 649.90, 'Prateleira E1', 'Fotos/Mouse Gamer Sem Fio Aether Labs FeatherLight X Pro 8K Carbon.jpg'),
    ('PF-002', 'Webcam Profissional VoxStudio ClearVision 4K60 AI Gimbal HDR', 'Periféricos', 4, 2, 1300.00, 1799.90, 'Prateleira E1', 'Fotos/Webcam Profissional VoxStudio ClearVision 4K60 AI Gimbal HDR.jpg'),
    ('PF-003', 'Headset Sem Fio VoxStudio NovaPlanar Pro Wireless ANC + Hot-Swap Battery', 'Periféricos', 5, 2, 1350.00, 1899.90, 'Prateleira E2', 'Fotos/Headset Sem Fio VoxStudio NovaPlanar Pro Wireless ANC + Hot-Swap Battery.jpg'),
    ('PF-004', 'Headset Gamer VoxStudio CloudCore V2 7.1 Surround USB', 'Periféricos', 14, 5, 260.00, 379.90, 'Prateleira E2', 'Fotos/Headset Gamer VoxStudio CloudCore V2 7.1 Surround USB.jpg'),
    ('PF-005', 'Fone In-Ear Monitor (IEM) Gamer & Audiófilo VoxStudio AriaStage Hexa Hybrid', 'Periféricos', 9, 3, 350.00, 499.90, 'Prateleira E3', 'Fotos/Fone In-Ear Monitor (IEM) Gamer & Audiófilo VoxStudio AriaStage Hexa Hybrid.jpg'),
    ('TC-001', 'Teclado Mecânico Gamer Aether Labs Phantom 60 Mini RGB', 'Periféricos', 18, 6, 220.00, 299.90, 'Prateleira F1', 'Fotos/Teclado Mecânico Gamer Aether Labs Phantom 60 Mini RGB.jpg'),
    ('TC-002', 'Teclado Mecânico Gamer Aether Labs Imperium 100 Full-Size RGB', 'Periféricos', 11, 5, 320.00, 449.90, 'Prateleira F1', 'Fotos/Teclado Mecânico Gamer Aether Labs Imperium 100 Full-Size RGB.jpg'),
    ('TC-003', 'Teclado Mecânico Custom Aether Labs NovaKey 65 Wireless Gasket', 'Periféricos', 6, 3, 480.00, 649.90, 'Prateleira F2', 'Fotos/Teclado Mecânico Custom Aether Labs NovaKey 65 Wireless Gasket.jpg'),
    ('TC-004', 'Teclado Mecânico Custom Aether Labs Aether 75 Pro TFT & Knob', 'Periféricos', 4, 3, 650.00, 899.90, 'Prateleira F2', 'Fotos/Teclado Mecânico Custom Aether Labs Aether 75 Pro TFT & Knob.jpg'),
    ('TC-005', 'Teclado Mecânico Low-Profile Aether Labs Vortex 70 Air Ultra-Slim QMK-VIA', 'Periféricos', 7, 3, 520.00, 699.90, 'Prateleira F3', 'Fotos/Teclado Mecânico Low-Profile Aether Labs Vortex 70 Air Ultra-Slim QMK-VIA.jpg'),
    ('TC-006', 'Teclado Mecânico Wireless Aether Labs Chronos 96 Pro Silent Master', 'Periféricos', 5, 3, 560.00, 749.90, 'Prateleira F3', 'Fotos/Teclado Mecânico Wireless Aether Labs Chronos 96 Pro Silent Master.jpg'),
    ('TC-007', 'Teclado Magnético Gamer Aether Labs Pulse 60 HE Pro Rapid Trigger', 'Periféricos', 9, 4, 600.00, 799.90, 'Prateleira F4', 'Fotos/Teclado Magnético Gamer Aether Labs Pulse 60 HE Pro Rapid Trigger.jpg'),
    ('TC-008', 'Teclado Magnético Gamer Aether Labs Valkyrie 75 HE 8K Wireless', 'Periféricos', 3, 3, 900.00, 1199.90, 'Prateleira F4', 'Fotos/Teclado Magnético Gamer Aether Labs Valkyrie 75 HE 8K Wireless.jpg'),
    ('TC-009', 'Teclado Magnético Aether Labs Spectre 70 HE Alumínio CNC', 'Periféricos', 2, 2, 1300.00, 1699.90, 'Prateleira F5', 'Fotos/Teclado Magnético Aether Labs Spectre 70 HE Alumínio CNC.jpg'),
    ('TC-010', 'Teclado Óptico Gamer Aether Labs Titan TKL 80 eSports 8K', 'Periféricos', 8, 4, 700.00, 949.90, 'Prateleira F5', 'Fotos/Teclado Óptico Gamer Aether Labs Titan TKL 80 eSports 8K.jpg')
)
SELECT v.sku, v.nome, c.id, v.quantidade, v.minimo, v.custo, v.preco, v.local, v.foto
FROM v
JOIN categoria c ON c.nome = v.categoria;

-- Estoque inicial de cada produto, como movimento de entrada
INSERT INTO movimento (produto_id, tipo, quantidade, valor, custo_unitario, observacao)
SELECT id, 'entrada', quantidade, 0, custo, 'Estoque inicial'
FROM produto
WHERE quantidade > 0;

COMMIT;

-- Conferência
-- SELECT c.nome, COUNT(*) AS produtos, SUM(p.quantidade) AS unidades
-- FROM produto p JOIN categoria c ON c.id = p.categoria_id
-- GROUP BY c.nome ORDER BY c.nome;