'use client'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils/formatters'

export interface BudgetLine {
  id?: string
  category: string
  description: string | null
  justification?: string | null
  estimated_amount: number
  actual_amount?: number | null
}

interface BudgetLineItemsProps {
  items: BudgetLine[]
  onChange?: (items: BudgetLine[]) => void
  readOnly?: boolean
  showActual?: boolean
}

const CATEGORIES = [
  'Venue', 'Catering', 'Transport', 'Equipment',
  'Marketing', 'Accommodation', 'Speakers/Facilitators',
  'Printing', 'Contingency', 'Other',
]

export function BudgetLineItems({ items, onChange, readOnly, showActual }: BudgetLineItemsProps) {
  const addLine = () => {
    if (!onChange) return
    onChange([...items, { category: '', description: '', justification: '', estimated_amount: 0, actual_amount: null }])
  }

  const removeLine = (index: number) => {
    if (!onChange) return
    onChange(items.filter((_, i) => i !== index))
  }

  const updateLine = (index: number, field: keyof BudgetLine, value: string | number) => {
    if (!onChange) return
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    onChange(updated)
  }

  const totalEstimated = items.reduce((sum, item) => sum + (Number(item.estimated_amount) || 0), 0)
  const totalActual = items.reduce((sum, item) => sum + (Number(item.actual_amount) || 0), 0)

  if (readOnly) {
    return (
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 gap-4">
            <div>
              <p className="text-sm font-medium">{item.category}</p>
              {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
              {item.justification && <p className="text-xs text-gray-400 mt-1">Why needed: {item.justification}</p>}
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{formatCurrency(item.estimated_amount)}</p>
              {showActual && item.actual_amount !== undefined && item.actual_amount !== null && (
                <p className="text-xs text-cyan-700">Actual: {formatCurrency(item.actual_amount)}</p>
              )}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t-2 border-gray-200">
          <div>
            <p className="font-semibold">Total Estimated</p>
            {showActual && <p className="text-xs text-gray-500">Actual total shown when submitted.</p>}
          </div>
          <div className="text-right">
            <p className="font-bold text-green-700">{formatCurrency(totalEstimated)}</p>
            {showActual && <p className="text-xs font-semibold text-cyan-700">{formatCurrency(totalActual)}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="grid gap-2 p-3 bg-gray-50 rounded-lg md:grid-cols-[1fr,1fr,1fr,140px,140px,48px] md:items-end">
          <div className="flex-1 min-w-0">
            <Label className="text-xs mb-1 block">Category</Label>
            <select
              value={item.category}
              onChange={(e) => updateLine(index, 'category', e.target.value)}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-0">
            <Label className="text-xs mb-1 block">Description</Label>
            <Input
              placeholder="Brief description"
              value={item.description ?? ''}
              onChange={(e) => updateLine(index, 'description', e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <Label className="text-xs mb-1 block">Justification</Label>
            <Input
              placeholder="Why this line is needed"
              value={item.justification ?? ''}
              onChange={(e) => updateLine(index, 'justification', e.target.value)}
            />
          </div>
          <div className="w-32">
            <Label className="text-xs mb-1 block">Amount (INR)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={item.estimated_amount || ''}
              onChange={(e) => updateLine(index, 'estimated_amount', parseFloat(e.target.value) || 0)}
            />
          </div>
          {showActual && (
            <div className="w-32">
              <Label className="text-xs mb-1 block">Actual (INR)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={item.actual_amount || ''}
                onChange={(e) => updateLine(index, 'actual_amount', parseFloat(e.target.value) || 0)}
              />
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeLine(index)}
            className="flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addLine} className="gap-2">
        <Plus className="w-4 h-4" />
        Add Budget Line
      </Button>

      {items.length > 0 && (
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div>
            <span className="font-medium text-sm">Total Estimated</span>
            {showActual && <p className="text-xs text-gray-500">Actual total updates the final ECR spend.</p>}
          </div>
          <div className="text-right">
            <span className="font-bold text-green-700">{formatCurrency(totalEstimated)}</span>
            {showActual && <p className="text-xs font-semibold text-cyan-700">{formatCurrency(totalActual)}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
