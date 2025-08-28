;; SUPER SIMPLE NFT - NO LET BINDINGS, NO COMPLEX OPERATIONS
;; This should definitely work

(define-map owners uint principal)
(define-data-var counter uint u0)

;; Mint without let binding
(define-public (mint (to principal))
  (begin
    (map-set owners (var-get counter) to)
    (var-set counter (+ (var-get counter) u1))
    (ok true)))

;; Transfer - just map-set
(define-public (transfer (id uint) (to principal))
  (begin
    (map-set owners id to)
    (ok true)))

;; Owner - just map-get
(define-read-only (get-owner (id uint))
  (map-get? owners id))

;; Counter - just var-get
(define-read-only (get-counter)
  (var-get counter))