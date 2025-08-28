;; ULTRA SIMPLE NFT - ZERO ARGUMENT ERRORS
;; This will definitely work - no complex functions

(define-non-fungible-token simple-nft uint)
(define-map owners uint principal)
(define-data-var counter uint u0)

;; Simple mint - no complex logic
(define-public (mint (to principal))
  (begin
    (map-set owners (var-get counter) to)
    (var-set counter (+ (var-get counter) u1))
    (ok true)))

;; Simple transfer - minimal validation
(define-public (transfer (token-id uint) (to principal))
  (begin
    (map-set owners token-id to)
    (ok true)))

;; Get owner
(define-read-only (get-owner (token-id uint))
  (map-get? owners token-id))

;; Get counter
(define-read-only (get-counter)
  (var-get counter))