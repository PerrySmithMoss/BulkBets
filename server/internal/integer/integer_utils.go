package integer

func DerefInt8(p *int8) interface{} {
	if p == nil {
		return nil
	}
	return *p
}
