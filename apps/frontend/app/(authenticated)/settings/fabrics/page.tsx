'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import {
  fabricsApi,
  departmentsApi,
  groupsApi,
  materialsApi,
  brandsApi,
  colorsApi,
  fabricTypesApi,
  fabricCompositionsApi,
  gradesApi,
} from '@/lib/api/settings';
import { machinesApi } from '@/lib/api/machines';
import { MachineLookup } from '@/lib/types/machine';
import {
  Fabric,
  FabricFormData,
  widthUnitOptions,
  Department,
  Group,
  Material,
  Brand,
  Color,
  FabricType,
  FabricCompositionType,
  Grade,
} from '@/lib/types/settings';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, Eye, X } from 'lucide-react';

export default function FabricsPage() {
  const { showToast } = useToast();
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Fabric | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedFabric, setSelectedFabric] = useState<Fabric | null>(null);

  // Master data for dropdowns
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [colors, setColors] = useState<Color[]>([]);
  const [machines, setMachines] = useState<MachineLookup[]>([]);
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [fabricCompositions, setFabricCompositions] = useState<FabricCompositionType[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    fetchFabrics();
    fetchMasterData();
  }, []);

  const fetchFabrics = async () => {
    setLoading(true);
    try {
      const data = await fabricsApi.getAll();
      setFabrics(data);
    } catch (error) {
      showToast('error', 'Failed to load fabrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [depts, mats, brnds, clrs, machs, fabTypes, fabComps, grds] = await Promise.all([
        departmentsApi.getAll(),
        materialsApi.getAll(),
        brandsApi.getAll(),
        colorsApi.getAll(),
        machinesApi.getLookup(),
        fabricTypesApi.getAll(),
        fabricCompositionsApi.getAll(),
        gradesApi.getAll(),
      ]);
      setDepartments(depts.filter((d) => d.isActive));
      setMaterials(mats.filter((m) => m.isActive));
      setBrands(brnds.filter((b) => b.isActive));
      setColors(clrs.filter((c) => c.isActive));
      setMachines(machs.filter((m) => m.status === 'OPERATIONAL' || m.status === 'IDLE'));
      setFabricTypes(fabTypes.filter((ft) => ft.isActive));
      setFabricCompositions(fabComps.filter((fc) => fc.isActive));
      setGrades(grds.filter((g) => g.isActive));
    } catch (error) {
      console.error('Failed to load master data:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this fabric?')) return;
    try {
      await fabricsApi.delete(id);
      showToast('success', 'Fabric deleted');
      fetchFabrics();
    } catch (error: any) {
      showToast('error', error.response?.data?.error || 'Failed to delete fabric');
    }
  };

  const handlePrintQR = (fabric: Fabric) => {
    if (!fabric.qrPayload) {
      showToast('error', 'QR code not generated for this fabric');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('error', 'Could not open print window');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fabric QR Label - ${fabric.code}</title>
          <style>
            @page { size: 50mm 30mm; margin: 2mm; }
            body {
              margin: 0; padding: 4mm; font-family: Arial, sans-serif;
              display: flex; flex-direction: column; align-items: center;
              justify-content: center; min-height: 100vh;
            }
            .label { text-align: center; border: 1px solid #ccc; padding: 8px; background: white; }
            .qr-container { margin-bottom: 4px; }
            .fabric-code { font-size: 12px; font-weight: bold; margin: 4px 0 2px; }
            .fabric-name { font-size: 10px; color: #666; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            @media print { body { margin: 0; padding: 2mm; } .label { border: none; padding: 0; } }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="qr-container"><svg id="qr-code"></svg></div>
            <div class="fabric-code">${fabric.code}</div>
            <div class="fabric-name">${fabric.name}</div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
          <script>
            QRCode.toString('${fabric.qrPayload}', { type: 'svg', width: 80, margin: 0, errorCorrectionLevel: 'M' }, function(err, svg) {
              if (!err) { document.getElementById('qr-code').outerHTML = svg; setTimeout(() => { window.print(); window.close(); }, 500); }
            });
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredFabrics = fabrics.filter((f) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && f.isActive) ||
      (filter === 'inactive' && !f.isActive);
    const matchesSearch =
      searchQuery === '' ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Fabric Modal Component
  const FabricModal = () => {
    const [formData, setFormData] = useState<FabricFormData>({
      name: editing?.name || '',
      departmentId: editing?.departmentId || 0,
      groupId: editing?.groupId || 0,
      materialId: editing?.materialId || null,
      brandId: editing?.brandId || null,
      colorId: editing?.colorId || null,
      machineId: editing?.machineId || null,
      gradeId: editing?.gradeId || null,
      fabricTypeId: editing?.fabricTypeId || null,
      fabricCompositionId: editing?.fabricCompositionId || null,
      gsm: editing?.gsm ?? null,
      width: editing?.width ?? null,
      widthUnit: (editing?.widthUnit as 'inch' | 'cm') || 'inch',
      isTube: editing?.isTube ?? false,
      description: editing?.description || '',
      notes: editing?.notes || '',
      isActive: editing?.isActive ?? true,
    });
    const [saving, setSaving] = useState(false);
    const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);

    // Load groups when department changes
    useEffect(() => {
      if (formData.departmentId) {
        groupsApi.getAll(formData.departmentId).then((grps) => {
          setFilteredGroups(grps.filter((g) => g.isActive));
        });
      } else {
        setFilteredGroups([]);
      }
    }, [formData.departmentId]);

    const handleDepartmentChange = (deptId: number) => {
      setFormData({
        ...formData,
        departmentId: deptId,
        groupId: 0, // Reset group when department changes
      });
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.departmentId) {
        showToast('error', 'Please select a department');
        return;
      }
      if (!formData.groupId) {
        showToast('error', 'Please select a group');
        return;
      }

      setSaving(true);
      try {
        if (editing) {
          await fabricsApi.update(editing.id, formData);
          showToast('success', 'Fabric updated');
        } else {
          await fabricsApi.create(formData);
          showToast('success', 'Fabric created');
        }
        setShowModal(false);
        setEditing(null);
        fetchFabrics();
      } catch (error: any) {
        showToast('error', error.response?.data?.error || 'Failed to save fabric');
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border sticky top-0 bg-factory-dark flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {editing ? 'Edit Fabric' : 'Add Fabric'}
            </h2>
            <button
              onClick={() => {
                setShowModal(false);
                setEditing(null);
              }}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Code (auto-generated, show for editing) */}
            {editing && (
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Fabric Code (auto-generated)
                </label>
                <div className="px-4 py-2.5 rounded-xl bg-factory-gray/50 border border-factory-border text-primary-400 font-mono">
                  {editing.code}
                </div>
              </div>
            )}

            {/* Name */}
            <Input
              label="Fabric Name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Single Jersey Cotton"
              required
            />

            {/* Department & Group (cascading) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Department *
                </label>
                <select
                  value={formData.departmentId || ''}
                  onChange={(e) => handleDepartmentChange(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Group *
                </label>
                <select
                  value={formData.groupId || ''}
                  onChange={(e) => setFormData({ ...formData, groupId: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  disabled={!formData.departmentId}
                >
                  <option value="">
                    {formData.departmentId ? 'Select Group' : 'Select Department first'}
                  </option>
                  {filteredGroups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      {grp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Material & Brand (optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Material
                </label>
                <select
                  value={formData.materialId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      materialId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Material (optional)</option>
                  {materials.map((mat) => (
                    <option key={mat.id} value={mat.id}>
                      {mat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Brand</label>
                <select
                  value={formData.brandId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brandId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Brand (optional)</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Color & Machine */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Color</label>
                <select
                  value={formData.colorId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      colorId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Color (optional)</option>
                  {colors.map((color) => (
                    <option key={color.id} value={color.id}>
                      {color.name} {color.hexCode && `(${color.hexCode})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">Machine Number</label>
                <select
                  value={formData.machineId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      machineId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Machine (optional)</option>
                  {machines.map((machine) => (
                    <option key={machine.id} value={machine.id}>
                      {machine.machineNumber} - {machine.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type, Composition & Grade */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Fabric Type
                </label>
                <select
                  value={formData.fabricTypeId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fabricTypeId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Type</option>
                  {fabricTypes.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Composition
                </label>
                <select
                  value={formData.fabricCompositionId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fabricCompositionId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Composition</option>
                  {fabricCompositions.map((fc) => (
                    <option key={fc.id} value={fc.id}>
                      {fc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Grade
                </label>
                <select
                  value={formData.gradeId || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gradeId: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select Grade</option>
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {grade.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Width & GSM */}
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Width"
                type="number"
                value={formData.width ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    width: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="e.g., 72"
                step="0.01"
              />
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                  Width Unit
                </label>
                <select
                  value={formData.widthUnit || 'inch'}
                  onChange={(e) =>
                    setFormData({ ...formData, widthUnit: e.target.value as 'inch' | 'cm' })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {widthUnitOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="GSM (g/m²)"
                type="number"
                value={formData.gsm ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    gsm: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                placeholder="e.g., 180"
                step="0.01"
              />
            </div>

            {/* Tube checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="fabric-tube"
                checked={formData.isTube}
                onChange={(e) => setFormData({ ...formData, isTube: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="fabric-tube" className="text-neutral-300">
                Tube Fabric
              </label>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                Description
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional description..."
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1.5">Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-factory-gray border border-factory-border text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Internal notes..."
              />
            </div>

            {/* Active checkbox */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="fabric-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="fabric-active" className="text-neutral-300">
                Active
              </label>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Fabric Detail Modal with QR Code Display
  const FabricDetailModal = () => {
    if (!selectedFabric) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-factory-dark rounded-2xl border border-factory-border w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-factory-border flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Fabric Details</h2>
            <button
              onClick={() => {
                setShowDetailModal(false);
                setSelectedFabric(null);
              }}
              className="text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* QR Code Section */}
            <div className="flex flex-col items-center p-6 bg-white rounded-xl">
              {selectedFabric.qrPayload ? (
                <>
                  <QRCodeSVG
                    value={selectedFabric.qrPayload}
                    size={160}
                    level="M"
                    includeMargin={false}
                  />
                  <div className="mt-4 text-center">
                    <p className="text-lg font-bold text-gray-900">{selectedFabric.code}</p>
                    <p className="text-sm text-gray-600">{selectedFabric.name}</p>
                  </div>
                </>
              ) : (
                <div className="text-gray-500">QR code not generated</div>
              )}
            </div>

            {/* QR Payload */}
            {selectedFabric.qrPayload && (
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">
                  QR Payload (read-only)
                </label>
                <div className="px-4 py-2 rounded-lg bg-factory-gray border border-factory-border font-mono text-sm text-primary-400">
                  {selectedFabric.qrPayload}
                </div>
              </div>
            )}

            {/* Fabric Info Grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {selectedFabric.department && (
                <div>
                  <span className="text-neutral-400">Department:</span>
                  <span className="ml-2 text-white">{selectedFabric.department.name}</span>
                </div>
              )}
              {selectedFabric.group && (
                <div>
                  <span className="text-neutral-400">Group:</span>
                  <span className="ml-2 text-white">{selectedFabric.group.name}</span>
                </div>
              )}
              {selectedFabric.material && (
                <div>
                  <span className="text-neutral-400">Material:</span>
                  <span className="ml-2 text-white">{selectedFabric.material.name}</span>
                </div>
              )}
              {selectedFabric.brand && (
                <div>
                  <span className="text-neutral-400">Brand:</span>
                  <span className="ml-2 text-white">{selectedFabric.brand.name}</span>
                </div>
              )}
              {selectedFabric.machine && (
                <div>
                  <span className="text-neutral-400">Machine:</span>
                  <span className="ml-2 text-white">
                    #{selectedFabric.machine.machineNumber}
                    {selectedFabric.machine.name && ` - ${selectedFabric.machine.name}`}
                  </span>
                </div>
              )}
              {selectedFabric.color && (
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">Color:</span>
                  {selectedFabric.color.hexCode && (
                    <span
                      className="w-4 h-4 rounded-full border border-white/20"
                      style={{ backgroundColor: selectedFabric.color.hexCode }}
                    />
                  )}
                  <span className="text-white">{selectedFabric.color.name}</span>
                </div>
              )}
              {(selectedFabric.fabricType || selectedFabric.type) && (
                <div>
                  <span className="text-neutral-400">Type:</span>
                  <span className="ml-2 text-white">
                    {selectedFabric.fabricType?.name || selectedFabric.type}
                  </span>
                </div>
              )}
              {(selectedFabric.fabricComposition || selectedFabric.composition) && (
                <div>
                  <span className="text-neutral-400">Composition:</span>
                  <span className="ml-2 text-white">
                    {selectedFabric.fabricComposition?.name || selectedFabric.composition}
                  </span>
                </div>
              )}
              {selectedFabric.grade && (
                <div>
                  <span className="text-neutral-400">Grade:</span>
                  <span className="ml-2 text-white">{selectedFabric.grade.name}</span>
                </div>
              )}
              {selectedFabric.gsm && (
                <div>
                  <span className="text-neutral-400">GSM:</span>
                  <span className="ml-2 text-white">{selectedFabric.gsm} g/m²</span>
                </div>
              )}
              {selectedFabric.width && (
                <div>
                  <span className="text-neutral-400">Width:</span>
                  <span className="ml-2 text-white">
                    {selectedFabric.width} {selectedFabric.widthUnit || 'inch'}
                  </span>
                </div>
              )}
              <div>
                <span className="text-neutral-400">Tube:</span>
                <span className="ml-2 text-white">{selectedFabric.isTube ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="text-neutral-400">Status:</span>
                <span
                  className={`ml-2 ${selectedFabric.isActive ? 'text-green-400' : 'text-red-400'}`}
                >
                  {selectedFabric.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Print Button */}
            <div className="flex justify-center pt-2">
              <Button onClick={() => handlePrintQR(selectedFabric)} className="gap-2">
                <Printer className="w-4 h-4" />
                Print QR Label
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-400">
        <Link href="/settings" className="hover:text-white">
          Settings
        </Link>
        <span>/</span>
        <span className="text-white">Fabrics</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Fabrics</h1>
          <p className="text-neutral-400 mt-1">
            Manage fabric types with QR codes for hardware scanner integration
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>+ Add Fabric</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search fabrics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          {(['active', 'inactive', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize ${
                filter === f
                  ? 'bg-primary-500 text-white'
                  : 'bg-factory-gray text-neutral-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-factory-dark rounded-2xl border border-factory-border">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : filteredFabrics.length === 0 ? (
          <div className="text-center py-12 text-neutral-400">
            {fabrics.length === 0
              ? 'No fabrics yet. Add your first fabric!'
              : 'No fabrics match your filters.'}
          </div>
        ) : (
          <div className="divide-y divide-factory-border">
            {filteredFabrics.map((fabric) => (
              <div
                key={fabric.id}
                className="flex items-center justify-between p-4 hover:bg-factory-gray/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-primary-400 font-mono text-sm">{fabric.code}</span>
                    <span className="text-white font-medium">{fabric.name}</span>
                    {fabric.department && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                        {fabric.department.name}
                      </span>
                    )}
                    {fabric.group && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                        {fabric.group.name}
                      </span>
                    )}
                    {(fabric.fabricType || fabric.type) && (
                      <span className="px-2 py-0.5 bg-factory-border text-neutral-300 text-xs rounded">
                        {fabric.fabricType?.name || fabric.type}
                      </span>
                    )}
                    {fabric.color && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-factory-border text-neutral-300 text-xs rounded">
                        {fabric.color.hexCode && (
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: fabric.color.hexCode }}
                          />
                        )}
                        {fabric.color.name}
                      </span>
                    )}
                    {fabric.machine && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                        M#{fabric.machine.machineNumber}
                      </span>
                    )}
                    {fabric.grade && (
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                        {fabric.grade.name}
                      </span>
                    )}
                    {fabric.isTube && (
                      <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                        Tube
                      </span>
                    )}
                    {!fabric.isActive && (
                      <span className="px-2 py-0.5 bg-neutral-500/20 text-neutral-400 text-xs rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-neutral-400 mt-1">
                    {fabric.gsm && <span>GSM: {fabric.gsm}</span>}
                    {fabric.width && (
                      <span>
                        Width: {fabric.width}
                        {fabric.widthUnit || 'inch'}
                      </span>
                    )}
                    {(fabric.fabricComposition || fabric.composition) && (
                      <span>{fabric.fabricComposition?.name || fabric.composition}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFabric(fabric);
                      setShowDetailModal(true);
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePrintQR(fabric)}
                    title="Print QR Label"
                  >
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditing(fabric);
                      setShowModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(fabric.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showModal && <FabricModal />}
      {showDetailModal && <FabricDetailModal />}
    </div>
  );
}
