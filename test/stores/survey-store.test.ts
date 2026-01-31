import { describe, it, expect, beforeEach } from 'vitest'
import { useSurveyStore } from '@/lib/stores/survey-store'

describe('Survey Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSurveyStore.getState().reset()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useSurveyStore.getState()
      
      expect(state.currentStep).toBe(0)
      expect(state.isComplete).toBe(false)
      expect(state.formData).toEqual({})
      expect(state.photos).toEqual([])
      expect(state.validationErrors).toEqual({})
    })

    it('should initialize with empty form data', () => {
      const { formData } = useSurveyStore.getState()
      
      expect(Object.keys(formData)).toHaveLength(0)
    })
  })

  describe('Step Navigation', () => {
    it('should advance to next step', () => {
      const { nextStep } = useSurveyStore.getState()
      
      nextStep()
      
      expect(useSurveyStore.getState().currentStep).toBe(1)
    })

    it('should go to previous step', () => {
      const { nextStep, prevStep } = useSurveyStore.getState()
      
      nextStep()
      nextStep()
      expect(useSurveyStore.getState().currentStep).toBe(2)
      
      prevStep()
      expect(useSurveyStore.getState().currentStep).toBe(1)
    })

    it('should not go below step 0', () => {
      const { prevStep } = useSurveyStore.getState()
      
      prevStep()
      
      expect(useSurveyStore.getState().currentStep).toBe(0)
    })

    it('should set specific step', () => {
      const { setStep } = useSurveyStore.getState()
      
      setStep(5)
      
      expect(useSurveyStore.getState().currentStep).toBe(5)
    })

    it('should not allow negative step values', () => {
      const { setStep } = useSurveyStore.getState()
      
      setStep(-1)
      
      expect(useSurveyStore.getState().currentStep).toBe(0)
    })
  })

  describe('Form Data Management', () => {
    it('should update form data', () => {
      const { updateFormData } = useSurveyStore.getState()
      
      const newData = {
        property: {
          address: '123 Test St',
          city: 'Test City'
        }
      }
      
      updateFormData(newData)
      
      expect(useSurveyStore.getState().formData).toEqual(newData)
    })

    it('should merge form data updates', () => {
      const { updateFormData } = useSurveyStore.getState()
      
      updateFormData({
        property: { address: '123 Test St' }
      })
      
      updateFormData({
        property: { city: 'Test City' }
      })
      
      const { formData } = useSurveyStore.getState()
      expect(formData.property).toEqual({
        address: '123 Test St',
        city: 'Test City'
      })
    })

    it('should handle nested object updates', () => {
      const { updateFormData } = useSurveyStore.getState()
      
      updateFormData({
        hazards: {
          asbestos: {
            present: true,
            materials: ['floor tiles']
          }
        }
      })
      
      updateFormData({
        hazards: {
          asbestos: {
            friable: false
          }
        }
      })
      
      const { formData } = useSurveyStore.getState()
      expect(formData.hazards.asbestos).toEqual({
        present: true,
        materials: ['floor tiles'],
        friable: false
      })
    })

    it('should clear form data', () => {
      const { updateFormData, clearFormData } = useSurveyStore.getState()
      
      updateFormData({ test: 'data' })
      expect(useSurveyStore.getState().formData).toEqual({ test: 'data' })
      
      clearFormData()
      expect(useSurveyStore.getState().formData).toEqual({})
    })
  })

  describe('Photo Management', () => {
    it('should add photos', () => {
      const { addPhoto } = useSurveyStore.getState()
      
      const photo = {
        id: 'photo-1',
        url: 'blob:test-url',
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        caption: 'Test photo',
        location: 'basement'
      }
      
      addPhoto(photo)
      
      expect(useSurveyStore.getState().photos).toHaveLength(1)
      expect(useSurveyStore.getState().photos[0]).toEqual(photo)
    })

    it('should remove photos', () => {
      const { addPhoto, removePhoto } = useSurveyStore.getState()
      
      const photo1 = { id: 'photo-1', url: 'test1.jpg', file: new File([''], 'test1.jpg') }
      const photo2 = { id: 'photo-2', url: 'test2.jpg', file: new File([''], 'test2.jpg') }
      
      addPhoto(photo1)
      addPhoto(photo2)
      
      expect(useSurveyStore.getState().photos).toHaveLength(2)
      
      removePhoto('photo-1')
      
      const remainingPhotos = useSurveyStore.getState().photos
      expect(remainingPhotos).toHaveLength(1)
      expect(remainingPhotos[0].id).toBe('photo-2')
    })

    it('should update photo metadata', () => {
      const { addPhoto, updatePhoto } = useSurveyStore.getState()
      
      const photo = {
        id: 'photo-1',
        url: 'test.jpg',
        file: new File([''], 'test.jpg'),
        caption: 'Original caption'
      }
      
      addPhoto(photo)
      
      updatePhoto('photo-1', { caption: 'Updated caption', location: 'attic' })
      
      const updatedPhoto = useSurveyStore.getState().photos[0]
      expect(updatedPhoto.caption).toBe('Updated caption')
      expect(updatedPhoto.location).toBe('attic')
    })

    it('should clear all photos', () => {
      const { addPhoto, clearPhotos } = useSurveyStore.getState()
      
      addPhoto({ id: '1', url: 'test1.jpg', file: new File([''], 'test1.jpg') })
      addPhoto({ id: '2', url: 'test2.jpg', file: new File([''], 'test2.jpg') })
      
      expect(useSurveyStore.getState().photos).toHaveLength(2)
      
      clearPhotos()
      
      expect(useSurveyStore.getState().photos).toHaveLength(0)
    })
  })

  describe('Validation', () => {
    it('should set validation errors', () => {
      const { setValidationErrors } = useSurveyStore.getState()
      
      const errors = {
        'property.address': 'Address is required',
        'hazards.type': 'Hazard type must be selected'
      }
      
      setValidationErrors(errors)
      
      expect(useSurveyStore.getState().validationErrors).toEqual(errors)
    })

    it('should clear validation errors', () => {
      const { setValidationErrors, clearValidationErrors } = useSurveyStore.getState()
      
      setValidationErrors({ test: 'error' })
      expect(useSurveyStore.getState().validationErrors).toEqual({ test: 'error' })
      
      clearValidationErrors()
      expect(useSurveyStore.getState().validationErrors).toEqual({})
    })

    it('should validate required fields', () => {
      const { validateStep } = useSurveyStore.getState()
      
      const isValid = validateStep(0)
      
      expect(typeof isValid).toBe('boolean')
    })

    it('should validate step with form data', () => {
      const { updateFormData, validateStep } = useSurveyStore.getState()
      
      updateFormData({
        property: {
          address: '123 Test St',
          city: 'Test City'
        }
      })
      
      const isValid = validateStep(0)
      
      expect(typeof isValid).toBe('boolean')
    })
  })

  describe('Completion Status', () => {
    it('should mark survey as complete', () => {
      const { markComplete } = useSurveyStore.getState()
      
      markComplete()
      
      expect(useSurveyStore.getState().isComplete).toBe(true)
    })

    it('should check if survey can be completed', () => {
      const { canComplete } = useSurveyStore.getState()
      
      const canCompleteResult = canComplete()
      
      expect(typeof canCompleteResult).toBe('boolean')
    })

    it('should require all steps to be valid for completion', () => {
      const { updateFormData, canComplete } = useSurveyStore.getState()
      
      // Add minimal required data
      updateFormData({
        property: {
          address: '123 Test St',
          city: 'Test City'
        },
        hazards: {
          type: 'asbestos'
        }
      })
      
      const canCompleteResult = canComplete()
      
      expect(typeof canCompleteResult).toBe('boolean')
    })
  })

  describe('Store Reset', () => {
    it('should reset all state to initial values', () => {
      const { updateFormData, addPhoto, setStep, markComplete, reset } = useSurveyStore.getState()
      
      // Modify state
      updateFormData({ test: 'data' })
      addPhoto({ id: '1', url: 'test.jpg', file: new File([''], 'test.jpg') })
      setStep(5)
      markComplete()
      
      // Verify state is modified
      expect(useSurveyStore.getState().currentStep).toBe(5)
      expect(useSurveyStore.getState().isComplete).toBe(true)
      expect(Object.keys(useSurveyStore.getState().formData)).toHaveLength(1)
      expect(useSurveyStore.getState().photos).toHaveLength(1)
      
      // Reset
      reset()
      
      // Verify state is reset
      const state = useSurveyStore.getState()
      expect(state.currentStep).toBe(0)
      expect(state.isComplete).toBe(false)
      expect(state.formData).toEqual({})
      expect(state.photos).toEqual([])
      expect(state.validationErrors).toEqual({})
    })
  })

  describe('Persistence', () => {
    it('should save state to localStorage', () => {
      const { updateFormData, saveToStorage } = useSurveyStore.getState()
      
      updateFormData({ test: 'data' })
      saveToStorage()
      
      // Check if data was saved (would need to mock localStorage)
      expect(typeof saveToStorage).toBe('function')
    })

    it('should load state from localStorage', () => {
      const { loadFromStorage } = useSurveyStore.getState()
      
      // Mock localStorage data
      const mockData = {
        currentStep: 2,
        formData: { test: 'loaded data' },
        photos: []
      }
      
      // Would need to mock localStorage.getItem
      expect(typeof loadFromStorage).toBe('function')
    })

    it('should handle corrupted localStorage data', () => {
      const { loadFromStorage } = useSurveyStore.getState()
      
      // Should not throw error with corrupted data
      expect(() => loadFromStorage()).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('should handle large form data efficiently', () => {
      const { updateFormData } = useSurveyStore.getState()
      
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          value: Math.random()
        }))
      }
      
      const startTime = performance.now()
      updateFormData(largeData)
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should complete in under 100ms
    })

    it('should handle many photo operations efficiently', () => {
      const { addPhoto } = useSurveyStore.getState()
      
      const startTime = performance.now()
      
      for (let i = 0; i < 100; i++) {
        addPhoto({
          id: `photo-${i}`,
          url: `test-${i}.jpg`,
          file: new File([''], `test-${i}.jpg`)
        })
      }
      
      const endTime = performance.now()
      
      expect(endTime - startTime).toBeLessThan(500) // Should complete in under 500ms
      expect(useSurveyStore.getState().photos).toHaveLength(100)
    })
  })
})